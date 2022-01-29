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

exports.scrape = (text, cookie) =>
  new Promise((resolve, reject) => {
    fetch(primaryUrl + `entri/${text}`, { headers: { cookie } })
      .then((res) => res.text())
      .then((body) => {
        const $ = cheerio.load(body);
        const h4 = $('h4').text().toLowerCase();
        const login = h4.includes('halo');
        const error = h4.includes('entri tidak ditemukan');
        if (error)
          resolve({ success: false, message: 'entri tidak ditemukan', login });
        const text = $('h2').first().children().remove().end().text().trim();
        let definition = $('ol li')
          .map((i, el) => $(el).children().remove().end().text())
          .get();

        if (login) definition.pop();

        if (definition.length == 0) {
          definition = $('ul.adjusted-par li')
            .map((i, el) => {
              if (i == 0) {
                let text = $(el).text();
                if (text.includes('→')) {
                  resolve({
                    success: false,
                    message: `Bukan Kata Baku -> ${text
                      .replace('→', '')
                      .trim()}`,
                    login,
                  });
                }
                return $(el).children().remove().end().text();
              }
            })
            .get();
        }
        resolve({
          success: true,
          text,
          definition,
          login,
        });
      })
      .catch((err) => reject(err));
  });

exports.funcLogin = async () => {
  const { reqToken, cookieToken } = await getReqToken();
  console.log(email, pass);
  return await login(reqToken, cookieToken, email, pass);
};
