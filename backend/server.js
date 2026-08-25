const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// ========== CONFIG ==========
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 3000;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const ADMIN_KEY = process.env.ADMIN_KEY || crypto.randomBytes(32).toString('hex');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ========== MIDDLEWARE ==========
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.tiktok.com", "https://www.instagram.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(morgan('combined', {
  skip: (req) => req.url === '/api/health',
}));

// ========== RATE LIMITERS ==========
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);

// ========== HELPERS ==========
function sanitizeUsername(username) {
  return username.replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

function generateTokenPair(user) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { id: user.id, username: user.username, type: 'refresh', jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  return { accessToken, refreshToken };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
}

// Track failed login attempts (in-memory for MVP; use Redis in production)
const loginAttempts = new Map();

function checkLoginAttempts(identifier) {
  const attempts = loginAttempts.get(identifier);
  if (!attempts) return { blocked: false, attempts: 0 };

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const timePassed = Date.now() - attempts.lastAttempt;
    if (timePassed < LOCKOUT_DURATION_MINUTES * 60 * 1000) {
      return { blocked: true, attempts: attempts.count, retryAfter: Math.ceil((LOCKOUT_DURATION_MINUTES * 60 * 1000 - timePassed) / 60000) };
    }
    // Reset after lockout period
    loginAttempts.delete(identifier);
    return { blocked: false, attempts: 0 };
  }
  return { blocked: false, attempts: attempts.count };
}

function recordFailedLogin(identifier) {
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
  loginAttempts.set(identifier, {
    count: attempts.count + 1,
    lastAttempt: Date.now(),
  });
}

function clearLoginAttempts(identifier) {
  loginAttempts.delete(identifier);
}

// ========== DISPOSABLE EMAIL BLOCKLIST ==========
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', '10minutemail.com', 'temp-mail.org', 'fakeinbox.com',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'dispostable.com',
  'maildrop.cc', 'tempail.com', 'tempr.email', 'temp-mail.io',
  'getnada.com', 'emailondeck.com', '33mail.com', 'mytemp.email',
  'burnermail.io', 'harakirimail.com', 'tmail.ws', 'tmpmail.net',
  'mohmal.com', 'jetable.org', 'discard.email', 'discardmail.com',
  'mailcatch.com', 'trashmail.com', 'trashmail.me', 'trashmail.net',
  'trashmail.org', 'trashmail.io', 'mailexpire.com', 'mailnull.com',
  'spam4.me', 'bccto.me', 'chacuo.net', '0815.ru', '0clickemail.com',
  '0wnd.net', '0wnd.org', '1chuan.com', '1pad.de', '1zhuan.com',
  '20minutemail.com', '2prong.com', '30minutemail.com', '33mail.com',
  '3d-painting.com', '4warding.com', '4warding.net', '4warding.org',
  '5ghgfhfghfgh.tk', '60minutemail.com', '675hosting.com', '675hosting.net',
  '675hosting.org', '6url.com', '75hosting.com', '75hosting.net',
  '75hosting.org', '7tags.com', '9ox.net', 'a-bc.net', 'afrobacon.com',
  'agedmail.com', 'ajaxapp.net', 'alivance.com', 'amilegit.com',
  'amiri.net', 'anappthat.com', 'ano-mail.net', 'anonbox.net',
  'anonymbox.com', 'antichef.com', 'antichef.net', 'antireg.ru',
  'antispam.de', 'antispammail.de', 'armyspy.com', 'artman-conception.com',
  'azmeil.tk', 'baxomale.ht.cx', 'beefmilk.com', 'bigstring.com',
  'bladesmail.net', 'bloatbox.com', 'bobmail.info', 'bodhi.lawlita.com',
  'bofthew.com', 'bootybay.de', 'boun.cr', 'bouncr.com',
  'breakthru.com', 'brefmail.com', 'brennendesreich.de', 'broadbandninja.com',
  'bsnow.net', 'bspamfree.org', 'buffemail.com', 'bugmenot.com',
  'bumpymail.com', 'bundes-ede.de', 'burlee.com', 'burumail.com',
  'buymoreplays.com', 'buyusedlibrarybooks.org', 'bvsdv.com', 'c2.hu',
  'cachedot.net', 'casualdx.com', 'cellurl.com', 'centermail.com',
  'centermail.net', 'chammy.info', 'cheatmail.de', 'chogmail.com',
  'choicemail1.com', 'clixser.com', 'cmail.net', 'cmail.org',
  'coldemail.info', 'cool.fr.nf', 'correo.blogos.net', 'cosmorph.com',
  'courriel.fr.nf', 'courrieltemporaire.com', 'crapmail.org', 'crazymailing.com',
  'cubiclink.com', 'curryworld.de', 'cust.in', 'cuvox.de',
  'd3p.dk', 'dacoolest.com', 'dandikmail.com', 'dayrep.com',
  'dcemail.com', 'deadaddress.com', 'deadspam.com', 'delikkt.de',
  'despam.it', 'despammed.com', 'devnullmail.com', 'dfgh.net',
  'digitalsanctuary.com', 'dingbone.com', 'discardmail.com',
  'discardmail.de', 'disposable.cf', 'disposable.ga', 'disposable.ml',
  'disposable.tk', 'dismail.de', 'disposableaddress.com',
  'disposableemailaddresses.emailmiser.com', 'disposableinbox.com',
  'dispose.it', 'disposeamail.com', 'disposemail.com', 'disposmail.com',
  'dispostable.com', 'dm.w3internet.co.uk', 'dodgeit.com', 'dodgit.com',
  'dodgit.org', 'donemail.info', 'dontreg.com', 'dontsendmespam.de',
  'drdrb.com', 'drdrb.net', 'droplar.com', 'dropmail.me',
  'duam.net', 'dudmail.com', 'dump-email.info', 'dumpandjunk.com',
  'dumpmail.de', 'dumpyemail.com', 'e-mail.com', 'e-mail.org',
  'e4ward.com', 'easytrashmail.com', 'ee1.pl', 'ee2.pl',
  'eelmail.com', 'einmalmail.de', 'einrot.com', 'einrot.de',
  'eintagsmail.de', 'email-fake.cf', 'email-fake.com', 'email-fake.ga',
  'email-fake.gq', 'email-fake.ml', 'email-fake.tk', 'email60.com',
  'emailage.cf', 'emailage.ga', 'emailage.gq', 'emailage.ml',
  'emailage.tk', 'emaildienst.de', 'emailgo.de', 'emailias.com',
  'emailigo.de', 'emailinfive.com', 'emaillime.com', 'emailmiser.com',
  'emailproxsy.com', 'emailresort.com', 'emails.ga', 'emailsensei.com',
  'emailspam.cf', 'emailspam.ga', 'emailspam.gq', 'emailspam.ml',
  'emailspam.tk', 'emailta.tk', 'emailtemp.info', 'emailtemp.com',
  'emailtemp.net', 'emailtemporaire.com', 'emailtemporaire.fr',
  'emailthe.net', 'emailtmp.com', 'emailto.de', 'emailwarden.com',
  'emailx.at.hm', 'emailxfer.com', 'emeil.in', 'emeil.ir',
  'emz.net', 'enterto.com', 'ephemail.net', 'etranquil.com',
  'etranquil.net', 'etranquil.org', 'evopo.com', 'explodemail.com',
  'express.net.ua', 'eyepaste.com', 'fakeinbox.com', 'fakeinformation.com',
  'fakemail.fr', 'fakemailz.com', 'fammix.com', 'fansworldwide.de',
  'fantasymail.de', 'fastacura.com', 'fastchevy.com', 'fastchrysler.com',
  'fastkawasaki.com', 'fastmazda.com', 'fastmitsubishi.com', 'fastnissan.com',
  'fastsubaru.com', 'fastsuzuki.com', 'fasttoyota.com', 'fastyamaha.com',
  'fightallspam.com', 'filzmail.com', 'fixmail.tk', 'fizmail.com',
  'fizy.dk', 'flemail.ru', 'flyspam.com', 'footard.com',
  'forgetmail.com', 'fr33mail.info', 'frapmail.com', 'freemails.cf',
  'freemails.ga', 'freemails.ml', 'freundin.ru', 'friendlymail.co.uk',
  'front14.org', 'fuckingduh.com', 'fudgerub.com', 'fux0ringduh.com',
  'fyii.de', 'garliclife.com', 'gehensiull.com', 'get-mail.cf',
  'get-mail.ga', 'get-mail.ml', 'get-mail.tk', 'get1mail.com',
  'get2mail.fr', 'get2mail.nl', 'get2patient.com', 'get365.info',
  'get365.com', 'getaemail.com', 'getairmail.cf', 'getairmail.com',
  'getairmail.ga', 'getairmail.gq', 'getairmail.ml', 'getairmail.tk',
  'getmails.eu', 'getonemail.com', 'getonemail.net', 'ghosttexter.de',
  'girlsundertheinfluence.com', 'gishpuppy.com', 'goemailgo.com',
  'gorillaswithdirtyarmpits.com', 'gotmail.com', 'gotmail.net',
  'gotmail.org', 'gowikibooks.com', 'gowikicampus.com', 'gowikicars.com',
  'gowikifilms.com', 'gowikigames.com', 'gowikimusic.com', 'gowikinetwork.com',
  'gowikitravel.com', 'gowikitv.com', 'grandmamail.com', 'grandmasmail.com',
  'great-host.in', 'greensloth.com', 'greermail.info', 'guerillamail.biz',
  'guerillamail.com', 'guerillamail.de', 'guerillamail.info', 'guerillamail.net',
  'guerillamail.org', 'guerrillamail.biz', 'guerrillamail.com',
  'guerrillamail.de', 'guerrillamail.info', 'guerrillamail.net',
  'guerrillamail.org', 'guerrillamailblock.com', 'guerrillamailblock.de',
  'guerrillamailblock.info', 'guerrillamailblock.net', 'guerrillamailblock.org',
  'gustr.com', 'h8s.org', 'hacccc.com', 'hailmail.net',
  'habitue.net', 'happypizza.me', 'harakirimail.com', 'hartbot.de',
  'hat-gansen.de', 'hatespam.org', 'herp.in', 'hidemail.de',
  'hidzz.com', 'hmamail.com', 'hopemail.biz', 'hot-mail.cf',
  'hot-mail.ga', 'hot-mail.gq', 'hot-mail.ml', 'hot-mail.tk',
  'hotpop.com', 'hulapla.de', 'hushmail.com', 'ichimail.com',
  'imails.info', 'inbax.tk', 'inbox.si', 'inbox2.info',
  'inboxclean.com', 'inboxclean.org', 'inboxproxy.com', 'incognitomail.com',
  'incognitomail.net', 'incognitomail.org', 'ineec.net', 'infocom.zp.ua',
  'inoutmail.de', 'inoutmail.info', 'inoutmail.net', 'insorg-mail.info',
  'ipoo.org', 'irish2me.com', 'iwi.net', 'jetable.com',
  'jetable.fr.nf', 'jetable.net', 'jetable.org', 'jnxjn.com',
  'jourrapide.com', 'jsrsolutions.com', 'junk1e.com', 'junkmail.ga',
  'junkmail.gq', 'junkmail.ml', 'junkmail.tk', 'jwms1.com',
  'jwxs.net', 'kingsq.ga', 'kir.ch.tc', 'klassmaster.com',
  'klassmaster.net', 'klassmaster.org', 'klzlk.com', 'kurzepost.de',
  'lawlita.com', 'letthemeatspam.com', 'lhsdv.com', 'lifebyfood.com',
  'link2mail.net', 'litedrop.com', 'lol.ovpn.to', 'lol.ovpn.to',
  'lookugly.com', 'lopl.co.cc', 'lovemeleaveme.com', 'lr78.com',
  'lroid.com', 'lukop.dk', 'm21.cc', 'maboard.com',
  'mail-temporaire.fr', 'mail.by', 'mail.mezimages.net', 'mail.zp.ua',
  'mail114.net', 'mail1a.de', 'mail21.cc', 'mail2rss.org',
  'mail333.com', 'mail4trash.com', 'mailbidon.com', 'mailblocks.com',
  'mailblog.biz', 'mailbucket.org', 'mailcat.biz', 'mailcatch.com',
  'maildrop.cc', 'maildrop.cf', 'maildrop.ga', 'maildrop.gq',
  'maildrop.ml', 'maildu.de', 'maildx.com', 'maileater.com',
  'mailed.ro', 'maileimer.de', 'mailexpire.com', 'mailfa.tk',
  'mailforspam.com', 'mailfree.ga', 'mailfree.gq', 'mailfree.ml',
  'mailfreeonline.com', 'mailfs.com', 'mailguard.me', 'mailhazard.com',
  'mailhazard.us', 'mailhz.me', 'mailimate.com', 'mailin8r.com',
  'mailinater.com', 'mailinator.com', 'mailinator.net', 'mailinator.org',
  'mailinator.us', 'mailinator2.com', 'mailincubator.com', 'mailismagic.com',
  'mailmate.com', 'mailme.ir', 'mailme.lv', 'mailme24.com',
  'mailmetrash.com', 'mailmoat.com', 'mailnator.com', 'mailnesia.com',
  'mailnull.com', 'mailorg.org', 'mailpick.biz', 'mailproxsy.com',
  'mailquack.com', 'mailrock.biz', 'mailsac.com', 'mailscrap.com',
  'mailshell.com', 'mailsiphon.com', 'mailslite.com', 'mailtemp.info',
  'mailtothis.com', 'mailtrash.net', 'mailtv.net', 'mailtv.tv',
  'mailvelope.com', 'mailzi.ru', 'mailzilla.com', 'mailzilla.org',
  'makemetheking.com', 'manifestgenerator.com', 'manybrain.com',
  'mbx.cc', 'mega.zik.dj', 'meinspamschutz.de', 'meltmail.com',
  'messagebeamer.de', 'mezimages.net', 'mfsa.ru', 'mierdamail.com',
  'migmail.pl', 'migumail.com', 'mindless.com', 'ministry-of-silly-walks.de',
  'mintemail.com', 'misterpinball.de', 'mmmmail.com', 'moakt.com',
  'mobi.web.id', 'mobiail.tk', 'mohmal.com', 'mohmal.im',
  'mohmal.in', 'mohmal.com', 'moncourrier.fr.nf', 'monemail.fr.nf',
  'monmail.fr.nf', 'monumentmail.com', 'msa.minsmail.com', 'mt2015.com',
  'mx0.wwwnew.eu', 'my10minutemail.com', 'myalias.pw', 'mycard.net.ua',
  'mycleaninbox.net', 'myemailboxy.com', 'mymail-in.net', 'mymailoasis.com',
  'mymailoasis.net', 'mymailoasis.org', 'mynetstore.de', 'mypacks.net',
  'mypartyclip.de', 'myphantom.com', 'mysamp.de', 'myspaceinc.com',
  'myspaceinc.net', 'myspaceinc.org', 'myspacepimpedup.com', 'mytemp.email',
  'mytempemail.com', 'mytempmail.com', 'mythrowaway.email', 'mytempmail.com',
  'mytempmail.com', 'nabala.com', 'neomailbox.com', 'nepwk.com',
  'nervmich.net', 'nervtansen.de', 'netmails.com', 'netmails.net',
  'neverbox.com', 'nice-4u.com', 'nincsmail.hu', 'nnh.com',
  'no-spam.ws', 'nobulk.com', 'noclickemail.com', 'nogmailspam.info',
  'nomail.xl.cx', 'nomail2me.com', 'nomorespamemails.com', 'nonspam.eu',
  'nonspammer.de', 'noref.in', 'nospam.ze.tc', 'nospam4.us',
  'nospamfor.us', 'nospammail.net', 'nospamthanks.info', 'nothingtosee.com',
  'nukeit.com', 'nukeit.org', 'nus.edu.sg', 'nwldx.com',
  'objectmail.com', 'obobbo.com', 'odnorazovoe.ru', 'oneoffemail.com',
  'onewaymail.com', 'oopi.org', 'ordinaryamerican.net', 'otherinbox.com',
  'ourklips.com', 'outlawspam.com', 'ovpn.to', 'owlpic.com',
  'pancakemail.com', 'pimpedupmyspace.com', 'pjjkp.com', 'plexolan.de',
  'poczta.onet.pl', 'politikerclub.de', 'poofy.org', 'pookmail.com',
  'privacy.net', 'privatdemail.net', 'proxymail.eu', 'prtnx.com',
  'punkass.com', 'putthisinyouremail.com', 'qq.com', 'quickinbox.com',
  'quickmail.nl', 'rcpt.at', 'reallymymail.com', 'realtyalerts.ca',
  'recode.me', 'recursor.net', 'regbypass.com', 'regbypass.comsafe-mail.net',
  'rejectmail.com', 'reliable-mail.com', 'rhyta.com', 'rklips.com',
  'rmqkr.net', 'royal.net', 'rppkn.com', 'rtrtr.com',
  's0ny.net', 'safe-mail.net', 'safersignup.de', 'safetymail.info',
  'safetypost.de', 'sandelf.de', 'saynotospams.com', 'scatmail.com',
  'schafmail.de', 'schafmail.info', 'schrott-email.de', 'secretemail.de',
  'secure-mail.biz', 'selfdestructingmail.com', 'sendspamhere.com',
  'shiftmail.com', 'shitmail.me', 'shitmail.org', 'shitware.nl',
  'shmeriously.com', 'shortmail.net', 'sibmail.com', 'sinnlos-mail.de',
  'skeefmail.com', 'slaskpost.se', 'slipry.net', 'slopsbox.com',
  'slowslow.de', 'slutty.horse', 'smashmail.de', 'smellfear.com',
  'snakemail.com', 'sneakemail.com', 'sneakymail.de', 'snkmail.com',
  'sofimail.com', 'sofort-mail.de', 'softpls.asia', 'sogetthis.com',
  'soodonims.com', 'spam.la', 'spam.su', 'spam4.me',
  'spamavert.com', 'spambob.com', 'spambob.net', 'spambob.org',
  'spambog.com', 'spambog.de', 'spambog.ru', 'spambox.info',
  'spambox.irishspringrealty.com', 'spambox.us', 'spambox.xyz',
  'spamcannon.com', 'spamcannon.net', 'spamcero.com', 'spamcorptastic.com',
  'spamcowboy.com', 'spamcowboy.net', 'spamcowboy.org', 'spamdigger.com',
  'spamdns.com', 'spameater.com', 'spameater.de', 'spamex.com',
  'spamfighter.cf', 'spamfighter.ga', 'spamfighter.gq', 'spamfighter.ml',
  'spamfighter.tk', 'spamfree.eu', 'spamfree24.com', 'spamfree24.de',
  'spamfree24.eu', 'spamfree24.info', 'spamfree24.net', 'spamfree24.org',
  'spamgoes.in', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'spamherelots.com', 'spamhereplease.com', 'spamhole.com', 'spamify.com',
  'spaminator.de', 'spamkill.info', 'spaml.com', 'spaml.de',
  'spammotel.com', 'spamobox.com', 'spamoff.de', 'spamslicer.com',
  'spamspot.com', 'spamstack.net', 'spamthis.co.uk', 'spamthisplease.com',
  'spamtrail.com', 'spamtrap.ro', 'speed.1s.fr', 'spoofmail.de',
  'stuffmail.de', 'supergreatmail.com', 'supermailer.jp', 'superram.com',
  'supremepicks.com', 'surfeu.ru', 'svk.jp', 'sweetxxx.de',
  'tafmail.com', 'tagyoureit.com', 'talkinator.com', 'tapchicuoihoi.com',
  'teewars.org', 'teleworm.com', 'teleworm.us', 'temp-mail.org',
  'temp-mail.ru', 'temp.bobitized.com', 'temp.emeraldwebmail.com',
  'temp.headedmails.com', 'temp.mail-headquarters.com', 'temp mail.com',
  'temp mails.com', 'temp2.email', 'tempail.com', 'tempano.com',
  'tempbaker.com', 'tempemail.biz', 'tempemail.co.za', 'tempemail.com',
  'tempemail.net', 'tempemail.org', 'tempemail2.com', 'tempinbox.com',
  'tempmail.eu', 'tempmail.it', 'tempmail2.com', 'tempmailer.com',
  'tempmailer.de', 'tempomail.fr', 'temporarily.de', 'temporarioemail.com',
  'temporarioemail.com.br', 'temporaryemail.net', 'temporaryemail.us',
  'temporaryforwarding.com', 'temporaryinbox.com', 'temporarymailaddress.com',
  'tempemail.net', 'tempmailer.com', 'tempmailer.de', 'tempomail.fr',
  'temporarily.de', 'temporarioemail.com', 'temporarioemail.com.br',
  'temporaryemail.net', 'temporaryemail.us', 'temporaryforwarding.com',
  'temporaryinbox.com', 'temporarymailaddress.com', 'tempthe.net',
  'thankdog.com', 'thankyou2010.com', 'thc.st', 'thecloudindex.com',
  'thetempmail.com', 'throwawayemailaddress.com', 'tittbit.in',
  'tizi.com', 'tmailinator.com', 'toiea.com', 'toomail.biz',
  'topranklist.de', 'tradermail.info', 'trash-amil.com', 'trash-mail.at',
  'trash-mail.com', 'trash-mail.de', 'trash-me.com', 'trash2009.com',
  'trashdevil.com', 'trashdevil.de', 'trashemail.de', 'trashmail.at',
  'trashmail.com', 'trashmail.de', 'trashmail.me', 'trashmail.net',
  'trashmail.org', 'trashmail.ws', 'trashmailer.com', 'trashmailer.net',
  'trashymail.com', 'trashymail.net', 'trbvm.com', 'trbvn.com',
  'trbvo.com', 'trbw.com', 'trialmail.de', 'trickmail.net',
  'trillianpro.com', 'turual.com', 'twinmail.de', 'twoweeks.tk',
  'tyldd.com', 'uggsrock.com', 'umail.net', 'upliftnow.com',
  'uplipht.com', 'venompen.com', 'veryrealliemail.com', 'vidtag.com',
  'viewcastmedia.com', 'viewcastmedia.net', 'viewcastmedia.org',
  'vomoto.com', 'vpn.st', 'vsimcard.com', 'vubby.com',
  'wasteland.rfc822.org', 'webemail.me', 'weg-werf-email.de',
  'wegwerfadresse.de', 'wegwerfemail.com', 'wegwerfemail.de',
  'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
  'wegwerfmail24.de', 'wegwerfemailadresse.de', 'wegwerfemails.de',
  'wegwerfemailsite.de', 'wegwerfmailweb.de', 'wegwerfpost.de',
  'wegwerfpost.info', 'wegwerfpost.net', 'wegwerfpost.org',
  'wh4f.org', 'whatiaas.com', 'whatpaas.com', 'whyspam.me',
  'wickmail.net', 'wilemail.com', 'willhackforfood.biz', 'willselfdestruct.com',
  'winemaven.info', 'wronghead.com', 'wuzup.net', 'wuzupmail.net',
  'wwwnew.eu', 'xagloo.com', 'xemaps.com', 'xents.com',
  'xjoi.com', 'xmaily.com', 'xoxy.net', 'yapped.net',
  'yeah.net', 'yep.it', 'yogamaven.com', 'yomail.info',
  'yoplait.net', 'you-spam.com', 'ypmail.webarnak.fr.eu.org',
  'yuurok.com', 'zehnminutenmail.de', '1zhuan.com', '33mail.com',
  'emailfake.com', 'emailondeck.com', 'tempail.com', 'throwam.com',
]);

function isDisposableEmail(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}

// ========== ANTI-BOT HELPERS ==========
const signupTimestamps = new Map(); // Track form submission times
const MIN_FORM_TIME_MS = 3000; // Minimum 3 seconds to fill signup form

function checkAntiBot(req, res, next) {
  // 1. Honeypot field check — bots fill hidden fields
  const honeypot = req.body._website || req.body._company || req.body._fax;
  if (honeypot) {
    console.log(`[BOT BLOCKED] Honeypot filled from ${req.ip}`);
    return res.status(400).json({ error: 'Invalid request' });
  }

  // 2. Time-based check — bots submit too fast
  const formStarted = req.headers['x-form-start'];
  if (formStarted) {
    const elapsed = Date.now() - parseInt(formStarted, 10);
    if (elapsed < MIN_FORM_TIME_MS) {
      console.log(`[BOT BLOCKED] Form submitted in ${elapsed}ms from ${req.ip}`);
      return res.status(400).json({ error: 'Please take your time filling out the form' });
    }
  }

  // 3. Cloudflare Turnstile CAPTCHA verification
  const turnstileToken = req.body['cf-turnstile-response'];
  const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
  if (TURNSTILE_SECRET && turnstileToken) {
    // Verify token with Cloudflare (async, non-blocking if verification fails)
    fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${TURNSTILE_SECRET}&response=${turnstileToken}&remoteip=${req.ip}`,
    })
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        console.log(`[BOT BLOCKED] Turnstile verification failed from ${req.ip}`);
        return res.status(403).json({ error: 'CAPTCHA verification failed' });
      }
      next();
    })
    .catch(err => {
      console.error('Turnstile error:', err.message);
      next(); // Don't block on verification errors
    });
    return; // Don't call next() yet — waiting for Turnstile response
  }

  // 4. Missing or suspicious User-Agent
  const ua = req.headers['user-agent'] || '';
  if (!ua || ua.length < 10 || /bot|crawler|spider|scraper|curl|wget|python/i.test(ua)) {
    console.log(`[BOT BLOCKED] Suspicious User-Agent: ${ua} from ${req.ip}`);
    return res.status(403).json({ error: 'Access denied' });
  }

  // 5. Check for required browser headers (bots often miss these)
  if (!req.headers['accept-language'] || !req.headers['accept-encoding']) {
    console.log(`[BOT BLOCKED] Missing browser headers from ${req.ip}`);
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
}

// Track engagement patterns for anomaly detection
const engagementTracker = new Map(); // userId -> [{action, timestamp}]
const MAX_ACTIONS_PER_MINUTE = 10;
const MAX_ACTIONS_PER_HOUR = 100;

function checkEngagementAnomaly(userId) {
  const now = Date.now();
  const actions = engagementTracker.get(userId) || [];
  
  // Clean old entries
  const recent = actions.filter(a => now - a.timestamp < 3600000);
  engagementTracker.set(userId, recent);

  // Check per-minute rate
  const lastMinute = recent.filter(a => now - a.timestamp < 60000);
  if (lastMinute.length >= MAX_ACTIONS_PER_MINUTE) {
    return { blocked: true, reason: 'Too many actions per minute' };
  }

  // Check per-hour rate
  if (recent.length >= MAX_ACTIONS_PER_HOUR) {
    return { blocked: true, reason: 'Too many actions per hour' };
  }

  return { blocked: false };
}

// ========== AUTH MIDDLEWARE ==========
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') return res.status(401).json({ error: 'Invalid token type' });
    req.user = decoded;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ error: message });
  }
}

// ========== HEALTH CHECK ==========
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ status: 'error', error: 'Database unavailable' });
  }
});

// ========== SIGNUP ==========
app.post('/api/auth/signup', authLimiter, checkAntiBot, async (req, res) => {
  const { email, username, password, business_name, business_website, business_description } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Block disposable/temporary email domains
  if (isDisposableEmail(email)) {
    return res.status(400).json({ error: 'Disposable email addresses are not allowed. Please use a permanent email.' });
  }

  const cleanUsername = sanitizeUsername(username);
  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, _, -)' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Check password strength
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasNumber) {
    return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and a number' });
  }

  try {
    const hashedPwd = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, business_name, business_website, business_description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, total_points, approval_status`,
      [email.toLowerCase().trim(), cleanUsername, hashedPwd, business_name || null, business_website || null, business_description || null]
    );
    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokenPair(user);
    setRefreshCookie(res, refreshToken);
    res.json({ user, token: accessToken });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== LOGIN ==========
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const identifier = username.trim().toLowerCase();

  // Check lockout
  const lockout = checkLoginAttempts(identifier);
  if (lockout.blocked) {
    return res.status(429).json({
      error: `Account temporarily locked. Try again in ${lockout.retryAfter} minutes.`,
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, total_points, approval_status, business_name, business_website FROM users WHERE username = $1',
      [username.trim()]
    );
    if (result.rows.length === 0) {
      recordFailedLogin(identifier);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      recordFailedLogin(identifier);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    clearLoginAttempts(identifier);
    const { accessToken, refreshToken } = generateTokenPair(user);
    setRefreshCookie(res, refreshToken);
    delete user.password_hash;
    res.json({ user, token: accessToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== REFRESH TOKEN ==========
app.post('/api/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });

    const user = await pool.query(
      'SELECT id, username, email, total_points FROM users WHERE id = $1',
      [decoded.id]
    );
    if (user.rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user.rows[0]);
    setRefreshCookie(res, newRefreshToken);
    res.json({ token: accessToken, user: user.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ========== LOGOUT ==========
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true });
});

// ========== EMAIL VERIFICATION ==========
app.post('/api/auth/send-verification', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const user = await pool.query('SELECT id, email_verified FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'No account found with this email' });
    if (user.rows[0].email_verified) return res.status(400).json({ error: 'Email already verified' });

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.query(
      'UPDATE users SET verification_code = $1, verification_expires = $2 WHERE email = $3',
      [code, expires, email.toLowerCase().trim()]
    );

    // In production, send via Resend/Nodemailer/SendGrid
    // For now, log to console and return in dev mode
    console.log(`[EMAIL VERIFICATION] Code for ${email}: ${code}`);
    if (process.env.NODE_ENV !== 'production') {
      res.json({ success: true, message: 'Verification code sent', dev_code: code });
    } else {
      res.json({ success: true, message: 'Verification code sent to your email' });
    }
  } catch (err) {
    console.error('Send verification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/verify-email', authLimiter, async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  try {
    const user = await pool.query(
      'SELECT id, email_verified, verification_code, verification_expires FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (user.rows.length === 0) return res.status(404).json({ error: 'No account found' });

    const u = user.rows[0];
    if (u.email_verified) return res.status(400).json({ error: 'Email already verified' });
    if (!u.verification_code) return res.status(400).json({ error: 'No verification code. Request a new one.' });
    if (new Date(u.verification_expires) < new Date()) {
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }
    if (u.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    await pool.query(
      'UPDATE users SET email_verified = TRUE, verification_code = NULL, verification_expires = NULL WHERE id = $1',
      [u.id]
    );
    res.json({ success: true, message: 'Email verified!' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== GET FEED ==========
app.get('/api/videos/feed', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  try {
    const result = await pool.query(
      `SELECT v.id, v.url, v.watch_count, u.username, v.created_at
       FROM videos v
       JOIN users u ON v.submitted_by = u.id
       ORDER BY v.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ videos: result.rows });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== SUBMIT VIDEO ==========
app.post('/api/videos/submit', authenticate, submitLimiter, checkAntiBot, async (req, res) => {
  const { url } = req.body;
  const user_id = req.user.id;

  // Check approval status
  const userCheck = await pool.query('SELECT approval_status FROM users WHERE id = $1', [user_id]);
  if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  if (userCheck.rows[0].approval_status !== 'approved') {
    return res.status(403).json({ error: 'Your business profile is pending approval. You can post videos once approved.' });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
  }

  // Strict URL validation: only TikTok, Instagram Reels, YouTube Shorts
  const hostname = parsedUrl.hostname.replace(/^www\./, '');
  const pathname = parsedUrl.pathname.toLowerCase();

  const isTikTok = hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com');
  const isInstagramReel = hostname === 'instagram.com' && pathname.includes('/reel/');
  const isYouTubeShort = (hostname === 'youtube.com' || hostname === 'youtu.be') &&
    (pathname.includes('/shorts/') || pathname === '/shorts');

  if (!isTikTok && !isInstagramReel && !isYouTubeShort) {
    return res.status(400).json({
      error: 'Only TikTok videos, Instagram Reels, and YouTube Shorts are allowed. Regular YouTube videos, Instagram posts, and other links are not permitted.',
    });
  }

  if (url.length > 500) {
    return res.status(400).json({ error: 'URL too long (max 500 characters)' });
  }

  try {
    const today = getCurrentDate();
    const check = await pool.query(
      'SELECT id FROM videos WHERE submitted_by = $1 AND DATE(created_at) = $2',
      [user_id, today]
    );
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Already posted today. Come back tomorrow!' });
    }

    const result = await pool.query(
      'INSERT INTO videos (url, submitted_by) VALUES ($1, $2) RETURNING id, url, created_at',
      [url.trim(), user_id]
    );

    await pool.query(
      'UPDATE users SET last_post_date = $1 WHERE id = $2',
      [today, user_id]
    );

    // Log admin notification (visible in admin dashboard)
    const platform = isTikTok ? 'TikTok' : isInstagramReel ? 'Instagram Reels' : 'YouTube Shorts';
    console.log(`[VIDEO SUBMITTED] ${platform} by user ${user_id} (${url.trim()})`);

    res.json({ video: result.rows[0] });
  } catch (err) {
    console.error('Submit video error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== TRACK ENGAGEMENT (with transaction) ==========
app.post('/api/engagement/track', authenticate, trackLimiter, async (req, res) => {
  const { video_id, action } = req.body;
  const user_id = req.user.id;

  const pointsMap = { 'play': 5, '50_watch': 70, 'full_watch': 100, 'skip': -5 };

  if (!(action in pointsMap)) return res.status(400).json({ error: 'Invalid action' });
  if (!video_id) return res.status(400).json({ error: 'video_id is required' });

  // Anti-bot: check engagement pattern anomaly
  const anomaly = checkEngagementAnomaly(user_id);
  if (anomaly.blocked) {
    console.log(`[BOT BLOCKED] ${anomaly.reason} for user ${user_id}`);
    return res.status(429).json({ error: anomaly.reason });
  }
  // Record this action
  const userActions = engagementTracker.get(user_id) || [];
  userActions.push({ action, timestamp: Date.now() });
  engagementTracker.set(user_id, userActions);

  const points = pointsMap[action];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const recentCheck = await client.query(
      `SELECT id FROM engagements
       WHERE user_id = $1 AND video_id = $2 AND action = $3
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [user_id, video_id, action]
    );

    if (recentCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Already tracked this action recently' });
    }

    const videoCheck = await client.query('SELECT id FROM videos WHERE id = $1', [video_id]);
    if (videoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Video not found' });
    }

    await client.query(
      'INSERT INTO engagements (user_id, video_id, action, points) VALUES ($1, $2, $3, $4)',
      [user_id, video_id, action, points]
    );

    await client.query(
      'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
      [points, user_id]
    );

    if (action === 'play' || action === 'full_watch') {
      await client.query('UPDATE videos SET watch_count = watch_count + 1 WHERE id = $1', [video_id]);
    }

    // Create notification for video owner (not self)
    const videoOwner = await client.query('SELECT submitted_by FROM videos WHERE id = $1', [video_id]);
    if (videoOwner.rows.length > 0 && videoOwner.rows[0].submitted_by !== user_id) {
      const watcherName = await client.query('SELECT username FROM users WHERE id = $1', [user_id]);
      const actionLabels = { 'play': 'started watching', '50_watch': 'watched 50% of', 'full_watch': 'fully watched', 'skip': 'skipped' };
      const notifMsg = `${watcherName.rows[0]?.username || 'Someone'} ${actionLabels[action] || action} your video`;
      await client.query(
        'INSERT INTO notifications (user_id, type, message, video_id, from_username, points) VALUES ($1, $2, $3, $4, $5, $6)',
        [videoOwner.rows[0].submitted_by, 'engagement', notifMsg, video_id, watcherName.rows[0]?.username, points]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, points_awarded: points });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Track engagement error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ========== LEADERBOARD ==========
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank,
        username, total_points, created_at
       FROM users ORDER BY total_points DESC LIMIT 100`
    );
    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== USER PROFILE ==========
app.get('/api/users/:user_id', async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, username, total_points, created_at FROM users WHERE id = $1',
      [req.params.user_id]
    );
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const rank = await pool.query(
      'SELECT COUNT(*) as rank FROM users WHERE total_points > $1',
      [user.rows[0].total_points]
    );
    const videos = await pool.query(
      'SELECT id, url, watch_count, created_at FROM videos WHERE submitted_by = $1 ORDER BY created_at DESC',
      [req.params.user_id]
    );
    res.json({ user: user.rows[0], rank: parseInt(rank.rows[0].rank, 10) + 1, videos: videos.rows });
  } catch (err) {
    console.error('User profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== MY PROFILE (self) ==========
app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT id, username, total_points, created_at,
       business_name, business_website, business_description, approval_status, rejection_reason
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const rank = await pool.query(
      'SELECT COUNT(*) as rank FROM users WHERE total_points > $1',
      [user.rows[0].total_points]
    );
    const today = getCurrentDate();
    const hasPostedToday = await pool.query(
      'SELECT id FROM videos WHERE submitted_by = $1 AND DATE(created_at) = $2',
      [req.user.id, today]
    );
    res.json({
      user: user.rows[0],
      rank: parseInt(rank.rows[0].rank, 10) + 1,
      has_posted_today: hasPostedToday.rows.length > 0,
    });
  } catch (err) {
    console.error('My profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== DELETE ACCOUNT (GDPR Art. 17, DPDP §6) ==========
app.delete('/api/me', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = req.user.id;

    // Delete in correct order (foreign key constraints)
    await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM engagements WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM videos WHERE submitted_by = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    console.log(`Account deleted: ${userId}`);
    res.json({ success: true, message: 'Account and all personal data permanently deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  } finally {
    client.release();
  }
});

// ========== BUSINESS SUBMISSION ==========
app.put('/api/business/submit', authenticate, async (req, res) => {
  const { business_name, business_website, business_description } = req.body;
  if (!business_name || !business_website) {
    return res.status(400).json({ error: 'Business name and website are required' });
  }

  // Validate URL
  try { new URL(business_website); } catch {
    return res.status(400).json({ error: 'Invalid website URL' });
  }

  try {
    await pool.query(
      `UPDATE users SET business_name = $1, business_website = $2, business_description = $3, approval_status = 'pending'
       WHERE id = $4`,
      [business_name, business_website.trim(), business_description || null, req.user.id]
    );
    res.json({ success: true, message: 'Business profile submitted for review' });
  } catch (err) {
    console.error('Business submit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/business/status', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT business_name, business_website, business_description, approval_status, rejection_reason FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error('Business status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN MIDDLEWARE ==========
function adminOnly(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ========== ADMIN: List pending businesses ==========
app.get('/api/admin/pending', adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, business_name, business_website, business_description, approval_status, rejection_reason, created_at
       FROM users WHERE approval_status IN ('pending', 'rejected')
       ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin pending error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN: List all users ==========
app.get('/api/admin/users', adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, total_points, business_name, approval_status, created_at
       FROM users ORDER BY total_points DESC LIMIT 200`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN: Approve/reject business ==========
app.put('/api/admin/review', adminOnly, async (req, res) => {
  const { user_id, action, rejection_reason } = req.body;
  if (!user_id || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Missing user_id or invalid action' });
  }
  try {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const reason = action === 'reject' ? (rejection_reason || 'Does not meet content policy') : null;
    await pool.query(
      'UPDATE users SET approval_status = $1, rejection_reason = $2 WHERE id = $3',
      [status, reason, user_id]
    );
    // Create notification for the user
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length > 0) {
      const message = action === 'approve'
        ? 'Your business has been approved! You can now post video ads.'
        : `Your business was not approved. Reason: ${reason}`;
      await pool.query(
        'INSERT INTO notifications (user_id, type, message, points) VALUES ($1, $2, $3, 0)',
        [user_id, 'approval_update', message]
      );
    }
    res.json({ success: true, status });
  } catch (err) {
    console.error('Admin review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN: Stats ==========
app.get('/api/admin/stats', adminOnly, async (req, res) => {
  try {
    const [users, videos, pending, engagements] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM videos'),
      pool.query("SELECT COUNT(*) as count FROM users WHERE approval_status = 'pending'"),
      pool.query('SELECT COUNT(*) as count FROM engagements'),
    ]);
    res.json({
      total_users: parseInt(users.rows[0].count, 10),
      total_videos: parseInt(videos.rows[0].count, 10),
      pending_review: parseInt(pending.rows[0].count, 10),
      total_engagements: parseInt(engagements.rows[0].count, 10),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN: Recent videos ==========
app.get('/api/admin/videos', adminOnly, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const result = await pool.query(
      `SELECT v.id, v.url, v.watch_count, v.created_at,
       u.username, u.business_name, u.approval_status
       FROM videos v
       JOIN users u ON v.submitted_by = u.id
       ORDER BY v.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ videos: result.rows });
  } catch (err) {
    console.error('Admin videos error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN: Donation config ==========
app.get('/api/admin/donation-config', adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT key, value FROM site_config WHERE key IN ('kofi_url', 'bmc_url', 'donation_enabled')`
    );
    const config = {};
    result.rows.forEach(r => { config[r.key] = r.value; });
    res.json(config);
  } catch (err) {
    // If site_config table doesn't exist, return defaults
    res.json({ kofi_url: '', bmc_url: '', donation_enabled: 'false' });
  }
});

app.put('/api/admin/donation-config', adminOnly, async (req, res) => {
  const { kofi_url, bmc_url, donation_enabled } = req.body;
  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_config (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    if (kofi_url !== undefined) {
      await pool.query(
        `INSERT INTO site_config (key, value) VALUES ('kofi_url', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [kofi_url]
      );
    }
    if (bmc_url !== undefined) {
      await pool.query(
        `INSERT INTO site_config (key, value) VALUES ('bmc_url', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [bmc_url]
      );
    }
    if (donation_enabled !== undefined) {
      await pool.query(
        `INSERT INTO site_config (key, value) VALUES ('donation_enabled', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [String(donation_enabled)]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Donation config error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public endpoint for donation buttons (read-only, safe to expose)
app.get('/api/donations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT key, value FROM site_config WHERE key IN ('kofi_url', 'bmc_url', 'donation_enabled')`
    );
    const config = {};
    result.rows.forEach(r => { config[r.key] = r.value; });
    res.json({
      enabled: config.donation_enabled === 'true',
      kofi: config.kofi_url || '',
      bmc: config.bmc_url || '',
    });
  } catch {
    res.json({ enabled: false, kofi: '', bmc: '' });
  }
});

// ========== REPORT CONTENT ==========
app.post('/api/videos/report', authenticate, async (req, res) => {
  const { video_id, reason } = req.body;
  if (!video_id || !reason) return res.status(400).json({ error: 'video_id and reason required' });
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES videos(id),
        reported_by UUID NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(
      'INSERT INTO reports (video_id, reported_by, reason) VALUES ($1, $2, $3)',
      [video_id, req.user.id, reason]
    );
    res.json({ success: true, message: 'Report submitted. We review all reports within 24 hours.' });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== CONTENT POLICY ==========
app.get('/api/content-policy', (req, res) => {
  res.json({
    policy: {
      title: 'OutScroll Content Policy',
      lastUpdated: '2026-08-23',
      allowed: [
        'Business promotion videos (vertical format: Reels, Shorts, TikTok)',
        'Product demos and showcases',
        'Company culture and behind-the-scenes content',
        'Service explanations and tutorials',
        'Customer testimonials (with consent)',
      ],
      prohibited: [
        'Pornography, sexually explicit content, or adult material of any kind',
        'Gambling, betting, or casino-related content',
        'Weapons, firearms, ammunition, or military equipment sales',
        'Drugs, controlled substances, or drug paraphernalia',
        'Hate speech, discrimination, or harassment of any group',
        'Misinformation, fake news, or deliberately misleading content',
        'Scams, pyramid schemes, or fraudulent business opportunities',
        'Content that violates any applicable local, state, or international law',
        'Violence, graphic content, or content that promotes harm',
        'Spam, repeated identical submissions, or engagement farming',
        'Non-vertical video content (landscape videos, podcasts, etc.)',
        'Content that infringes on third-party intellectual property rights',
      ],
      enforcement: 'Violations result in immediate account suspension and content removal. Repeated violations result in permanent ban.',
      reporting: 'Report violations through the platform. All reports are reviewed within 24 hours.',
    }
  });
});

// ========== NOTIFICATIONS ==========
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const result = await pool.query(
      'SELECT id, type, message, video_id, from_username, points, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [req.user.id, limit]
    );
    const unread = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [req.user.id]
    );
    res.json({ notifications: result.rows, unread_count: parseInt(unread.rows[0].count, 10) });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notifications/read', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark notifications read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== DATA RETENTION / PURGE ==========
// Purge old data to keep DB under Supabase free tier (500MB).
// Videos, engagements, and notifications older than retention days are deleted.
app.post('/api/admin/purge', adminOnly, async (req, res) => {
  const videoRetentionDays = parseInt(req.body.video_retention_days, 10) || 90;
  const engagementRetentionDays = parseInt(req.body.engagement_retention_days, 10) || 90;
  const notificationRetentionDays = parseInt(req.body.notification_retention_days, 10) || 30;

  try {
    // Delete old notifications first (smallest, most numerous)
    const notifResult = await pool.query(
      'DELETE FROM notifications WHERE created_at < NOW() - INTERVAL $1 DAY',
      [notificationRetentionDays]
    );

    // Delete engagements for videos older than retention
    const engResult = await pool.query(
      `DELETE FROM engagements WHERE video_id IN (
        SELECT id FROM videos WHERE created_at < NOW() - INTERVAL $1 DAY
      )`,
      [engagementRetentionDays]
    );

    // Delete old videos (cascade will handle remaining references)
    const videoResult = await pool.query(
      'DELETE FROM videos WHERE created_at < NOW() - INTERVAL $1 DAY',
      [videoRetentionDays]
    );

    // Also purge reports for deleted videos
    const reportResult = await pool.query(
      `DELETE FROM reports WHERE video_id NOT IN (SELECT id FROM videos)`
    );

    // Purge orphaned notifications for deleted videos
    const orphanNotifResult = await pool.query(
      `DELETE FROM notifications WHERE video_id IS NOT NULL AND video_id NOT IN (SELECT id FROM videos)`
    );

    console.log(`[PURGE] Notifications: ${notifResult.rowCount}, Engagements: ${engResult.rowCount}, Videos: ${videoResult.rowCount}, Reports: ${reportResult.rowCount}, Orphan notifs: ${orphanNotifResult.rowCount}`);

    res.json({
      success: true,
      purged: {
        notifications: notifResult.rowCount,
        engagements: engResult.rowCount,
        videos: videoResult.rowCount,
        reports: reportResult.rowCount,
        orphaned_notifications: orphanNotifResult.rowCount,
      },
      retention_days: {
        videos: videoRetentionDays,
        engagements: engagementRetentionDays,
        notifications: notificationRetentionDays,
      },
    });
  } catch (err) {
    console.error('Purge error:', err);
    res.status(500).json({ error: 'Purge failed' });
  }
});

// ========== DB SIZE CHECK ==========
app.get('/api/admin/db-size', adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        (SELECT count(*) FROM users) as users,
        (SELECT count(*) FROM videos) as videos,
        (SELECT count(*) FROM engagements) as engagements,
        (SELECT count(*) FROM notifications) as notifications,
        (SELECT count(*) FROM reports) as reports
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('DB size error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== AUTO-PURGE ON STARTUP ==========
// Run purge on server start to keep DB clean
(async () => {
  try {
    const notifResult = await pool.query('DELETE FROM notifications WHERE created_at < NOW() - INTERVAL 30 DAY');
    const engResult = await pool.query(`DELETE FROM engagements WHERE video_id IN (SELECT id FROM videos WHERE created_at < NOW() - INTERVAL 90 DAY)`);
    const videoResult = await pool.query('DELETE FROM videos WHERE created_at < NOW() - INTERVAL 90 DAY');
    if (notifResult.rowCount + engResult.rowCount + videoResult.rowCount > 0) {
      console.log(`[AUTO-PURGE] Notifications: ${notifResult.rowCount}, Engagements: ${engResult.rowCount}, Videos: ${videoResult.rowCount}`);
    }
  } catch (err) {
    console.error('Auto-purge error (non-fatal):', err.message);
  }
})();

console.log('ADMIN_KEY:', ADMIN_KEY);

// ========== START SERVER ==========
const server = app.listen(PORT, () => {
  console.log(`OutScroll API running on port ${PORT}`);
});

// ========== GRACEFUL SHUTDOWN ==========
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await pool.end();
    console.log('Database pool closed.');
    process.exit(0);
  });
  setTimeout(() => { console.error('Forced shutdown'); process.exit(1); }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
