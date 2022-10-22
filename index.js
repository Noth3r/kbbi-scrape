require('dotenv').config();
const express = require('express');
const { funcLogin, scrape } = require('./utils/kbbi');
const { registerAccount } = require('./utils/registerAccount');
const email = process.env.EMAIL;
const pass = process.env.PASS;

let cookie;

const app = express();
app.use(express.json());

app.get('/search/:slug', async (req, res) => {
  const { slug } = req.params;
  let scrapeResult;
  do {
    if (!cookie || !scrapeResult?.login) cookie = await funcLogin(email, pass);
    scrapeResult = await scrape(slug, cookie);
    console.log(scrapeResult);
  } while (!scrapeResult.login);

  if (!scrapeResult.success) {
    return res
      .json({ success: false, message: scrapeResult.message })
      .status(400);
  }

  const { text, definition, success } = scrapeResult;
  return res.json({ success, text, definition }).status(200);
});

app.post('/register', async (req, res) => {
  const { namaLengkap, namaTampilan, email, pass } = req.body;
  const status = await registerAccount(namaLengkap, namaTampilan, email, pass);
  return res.json({ success: true, message: status }).status(200);
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
