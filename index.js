require('dotenv').config();
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const primaryUrl = 'https://kbbi.kemdikbud.go.id/';

const getReqToken = () =>
  new Promise((resolve, reject) => {
    fetch(primaryUrl + 'Account/Login')
      .then(async (res) => {
        const text = await res.text();
        const $ = cheerio.load(text);
        const reqToken = $('[name="__RequestVerificationToken"]').val();
        const cookieToken = res.headers.raw()['set-cookie'][0].split(';')[0];
        resolve({
          reqToken,
          cookieToken,
        });
      })
      .catch((err) => reject(err));
  });

const login = (reqToken, cookie, email, pass) =>
  new Promise((resolve, reject) => {
    fetch(primaryUrl + 'Account/Login', {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie,
      },
      body: `__RequestVerificationToken=${reqToken}&Posel=${email}&KataSandi=${pass}&IngatSaya=true&IngatSaya=false`,
      method: 'POST',
      redirect: 'manual',
    })
      .then((res) => resolve(res.headers.raw()['set-cookie'][2].split(';')[0]))
      .catch((err) => reject(err));
  });

const scrape = (text, cookie) =>
  new Promise((resolve, reject) => {
    fetch(primaryUrl + `entri/${text}`, { headers: { cookie } })
      .then((res) => res.text())
      .then((body) => {
        const $ = cheerio.load(body);
        const error = $('h4')
          .text()
          .toLowerCase()
          .includes('entri tidak ditemukan');
        if (error) resolve({ success: false });
        const text = $('h2').text();
        const definition = $('ol li')
          .map((i, el) => $(el).text())
          .get();
        definition.pop();
        resolve({
          success: true,
          text,
          definition,
        });
      })
      .catch((err) => reject(err));
  });

(async () => {
  const { reqToken, cookieToken } = await getReqToken();
  const email = process.env.EMAIL;
  const pass = process.env.PASS;
  const cookie = await login(reqToken, cookieToken, email, pass);
  const scrapeResult = await scrape('selamat', cookie);
  console.log(scrapeResult);
})();
