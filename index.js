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
const { Pool, Client } = require('pg')
let conn;
let pool;

const HOT_KEYS = [
  "placa de vídeo", "placa mãe", "ssd",
  "processador", "celular", "smarphone",
  "caixa de som", "jogo", "fonte", "notebook",
  "teclado", "mouse", "gabinete", "hd",
  "kit upgrade","ram", "placa-mãe", "smart tv",
  "pilha", "headset", "monitor", "mousepad", 
  "headphone", "pc gamer"];

hook.setUsername('Promo Bot');

app = express();
// * * * * * *
//   | | | | | |
//   | | | | | day of week
//   | | | | month
//   | | | day of month
//   | | hour
//   | minute
//   second ( optional )

connect();

var c = new Crawler({
  jQuery: true,
  maxConnections : 10,
  // This will be called for each crawled page
  callback : function (error, res, done) {
    if(error){
        console.log(error);
    } else {
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
            }
          });
          if (offer.link) {
            HOT_KEYS.forEach(key => {
              if (offer.description.toLowerCase().includes(key)) {
                offers.push(offer);
              }
            })
          }
        }
      });
      //TODO: Adicionar tratamento de "categorias".
      offers.forEach(offer => {
        setTimeout(() => {
          sendMessage(offer.id, offer.description, offer.lowPrice, offer.store, offer.link);
        }, 1000);
      })
    }
    done();
  }
});

async function sendMessage(id, title, price, store, link) {
  
  const promoChecked = await findPromo(id);
  if (promoChecked) return;

  const embed = new MessageBuilder()
    .setTitle(title)
    .setURL(link)
    .setDescription(`Promoção cadastrada com valor de R$ ${price}, na loja ${store}`)
    .setTimestamp()
    .setColor('#0099ff');
  try {
    hook.send(embed);
    insert(id, link);
  } catch (error) {
    console.error(error);
  }
}

function connect() {
  try {
    conn = new Client({connectionString: process.env.DATABASE_URL});
    conn.connect();
  } catch (error) {
    console.log(error);
  }
}

async function insert(id, link) {
  if (!conn) {
    return;
  }
  let { rows } = await conn.query(
    `insert into ${process.env.POSTGRE_TABLE} (id, link, created_at) values (${id}, ${link}, ${Date.now()}) returning *`
  );
  return rows;
}

async function findPromo(id) {
  if (!conn) {
    return;
  }
  let { rows } = await conn.query(`select * from ${process.env.POSTGRE_TABLE} where id = ${id}`);
  return rows;
}

cron.schedule('* * 1 * *', function() {
  console.log('running a task every hour');
  // c.queue('https://www.promobit.com.br/');
});
c.queue('https://www.promobit.com.br/');

app.listen(3000);
