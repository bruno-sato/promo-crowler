var Crawler = require("crawler");
const cheerio = require('cheerio');
const cron = require('node-cron');
const express = require('express');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const hook = new Webhook({
  url: process.env.CHAT_WEBHOOK,
  throwErrors: true,
  retryOnLimit: true
});
const { Client } = require('pg')
let conn;
let pool;

const HOT_KEYS = [
  "placa de vídeo", "placa mãe", "ssd",
  "processador", "celular", "smartphone",
  "caixa de som", "jogo", "fonte", "notebook",
  "teclado", "mouse", "gabinete", "hd",
  "kit upgrade","memória ram", "placa-mãe", "smart tv",
  "pilha", "headset", "monitor", "mousepad", 
  "headphone", "pc gamer", 'fone de ouvido', 'smartwatch',
  "ddr4", "computador"];

const EXCLUDE_KEYS = [
  "panela", "panelas", "taça", "taças", "pia", "cozinha",
  "talher", "talheres", "cama", "xícara", "xícaras", "mesa",
  "mesas", "cueca", "cuecas", "meia", "meias"
]

hook.setUsername('Promo Bot');
hook.setAvatar('https://media.discordapp.net/attachments/435528937381036053/768190466025455616/magofone640.jpg')

app = express();
// * * * * * *
//   | | | | | |
//   | | | | | day of week
//   | | | | month
//   | | | day of month
//   | | hour
//   | minute
//   second ( optional )

var c = new Crawler({
  jQuery: true,
  maxConnections : 10,
  // This will be called for each crawled page
  callback : async function (error, res, done) {
    if(error){
      console.log(error);
    } else {
      await connect();
      const $ = cheerio.load(res.body);
      var offerCards = $(".pr-tl-card").toArray();
      var offers = [];
      offerCards.forEach(card => {
        if (card.attribs['class'] !== 'card-banner') {
          let offer = {
            id: '',
            link: '',
            description: '',
            lowPrice: '',
            highPrice: '',
            store: '',
            imageLink: ''
          }
          card.children.forEach(cardChild => {
            if (cardChild.attribs && cardChild.attribs.class === 'info') {
              const info = cardChild.children;
              info.forEach(infoChildren => {
                if (infoChildren.attribs && infoChildren.attribs.class === 'price') {
                  infoChildren.children.forEach(priceChildren => {
                    if (priceChildren.attribs && priceChildren.attribs.itemprop === 'lowPrice') {
                      offer.lowPrice = priceChildren.attribs.content;
                    }
                    else if (priceChildren.attribs && priceChildren.attribs.itemprop === 'highPrice') {
                      offer.highPrice = priceChildren.attribs.content;
                    }
                  });
                }
                else if (infoChildren.attribs && infoChildren.attribs.class === 'where') {
                  if (infoChildren.children.length > 0) {
                    offer.store = infoChildren.children[0].data;
                  }
                }
              });
            }
            else if (cardChild.attribs && cardChild.attribs.class === 'bottom_title') {
              if (cardChild.children.length > 0) {
                offer.description = cardChild.children[0].children[0].children[0].data;
              }
            }
            else if (cardChild.attribs && cardChild.attribs['class'] === 'js-pr__tracking--click') {
              offer.link = `${'https://www.promobit.com.br'}${cardChild.attribs.href}`;
              let promoLink = cardChild.attribs.href.split('-')
              offer.id = `${promoLink[promoLink.length-1]}`;
              cardChild.children.forEach(cardImage => {
                if (cardImage.attribs && cardImage.attribs.class === 'product_image') {
                  cardImage.children.forEach(imageTag => {
                    if (imageTag.name === 'img' && imageTag.type === 'tag') {
                      offer.imageLink = imageTag.attribs['data-lazy'].substring(2, imageTag.attribs['data-lazy'].length);
                    }
                  });
                }
              });
            }
          });
          if (offer.link) {
            let isValidProduct = false;
            // console.log(offer.description.toLowerCase());
            for (const key of HOT_KEYS) {
              if (offer.description.toLowerCase().includes(key)) {
                isValidProduct = true;
                break;
              }
            }
            // console.log(isValidProduct);
            for (const key of EXCLUDE_KEYS) {
              if (offer.description.toLowerCase().includes(key)) {
                isValidProduct = false;
                break;
              }
            }
            // console.log(isValidProduct);
            if (isValidProduct) {
              offers.push(offer);
            }
          }
        }
      });
      // console.log(offers);
      offers.forEach(offer => {
        setTimeout(() => {
          sendMessage(offer.id, offer.description, offer.lowPrice, offer.store, offer.link, offer.imageLink);
        }, 1000);
      });
    }
    done();
  }
});

async function sendMessage(id, title, price, store, link, imageLink) {
  const promoChecked = await findPromo(id);
  if (promoChecked.rowCount > 0) {
    return
  } else {
    const embed = new MessageBuilder()
      .setTitle(title)
      .setURL(link)
      .addField('Valor', `R$ ${price}`, true)
      .addField('Loja', store, true)
      .setTimestamp()
      .setThumbnail(`https://${imageLink}`)
      .setColor('#0099ff');
    try {
      insert(id, link);
      hook.send(embed);
    } catch (error) {
      console.error(error);
    }
  }

}

async function connect() {
  try {
    conn = await new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    await conn.connect();
  } catch (error) {
    console.log(error);
  }
}

function insert(id, link) {
  conn.query({
    text: `insert into promo_read(id, link) values ($1, $2)`,
    values: [id, link]
  }).then(res => {
    return res;
  }).catch(error => {
    console.error(error);
  });
}

function findPromo(id) {
  return conn.query(`select * from promo_read where id = ${id}`)
    .then(res => {
      return res;
    }).catch(error => {
      console.error(error);
    });
}
c.queue('https://www.promobit.com.br/');

app.listen(process.env.PORT || 3000);
