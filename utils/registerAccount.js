const fetch = require('node-fetch');
const cheerio = require('cheerio');
const primaryUrl = 'https://kbbi.kemdikbud.go.id/';

const getToken = () =>
  new Promise((resolve, reject) => {
    fetch(primaryUrl + 'Account/Register')
      .then(async (res) => {
        const text = await res.text();
        const $ = cheerio.load(text);
        const reqToken = $('[name="__RequestVerificationToken"]').val();
        const gCaptchaSitekey = $('.g-recaptcha').attr('data-sitekey');
        const cookieToken = res.headers.raw()['set-cookie'][0].split(';')[0];
        resolve({
          reqToken,
          gCaptchaSitekey,
          cookieToken,
        });
      })
      .catch((err) => reject(err));
  });

const requestCaptcha = (gCaptchaSitekey, apiKey, pageUrl) =>
  new Promise((resolve, reject) => {
    fetch(
      `http://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${gCaptchaSitekey}&pageurl=${pageUrl}&json=1`
    )
      .then(async (res) => resolve(await res.json()))
      .catch((err) => reject(err));
  });

const getCaptchaToken = (apiKey, id) =>
  new Promise((resolve, reject) => {
    fetch(
      `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${id}&json=1`
    )
      .then(async (res) => resolve(await res.json()))
      .catch((err) => reject(err));
  });

const sleep = (waitTimeInMs) =>
  new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

const getCaptcha = async (gCaptchaSitekey) => {
  const apiKey = process.env.CAPTCHA_API;
  const pageUrl = 'https://kbbi.kemdikbud.go.id/Account/Register';
  const { request: captchaId } = await requestCaptcha(
    gCaptchaSitekey,
    apiKey,
    pageUrl
  );
  await sleep(15000);
  const data = await getCaptchaToken(apiKey, captchaId);
  return data;
};

const register = (
  reqToken,
  namaLengkap,
  namaTampilan,
  email,
  pass,
  captchaToken,
  cookie
) => {
  return new Promise((resolve, reject) => {
    fetch(primaryUrl + 'Account/Register', {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie,
      },
      body: `__RequestVerificationToken=${reqToken}&NamaLengkap=${namaLengkap}&NamaTampilan=${namaTampilan}&Posel=${email}&KataSandi=${pass}&KonfirmasiKataSandi=${pass}&g-recaptcha-response=${captchaToken}`,
      method: 'POST',
      redirect: 'manual',
    })
      .then(async (res) => resolve(await res.text()))
      .catch((err) => reject(err));
  });
};

exports.registerAccount = async (namaLengkap, namaTampilan, email, pass) => {
  const { reqToken, gCaptchaSitekey, cookieToken } = await getToken();
  const { request: captchaToken } = await getCaptcha(gCaptchaSitekey);
  const status = await register(
    reqToken,
    namaLengkap,
    namaTampilan,
    email,
    pass,
    captchaToken,
    cookieToken
  );
  return status;
};
