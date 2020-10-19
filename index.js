var Crawler = require("crawler");
const cheerio = require('cheerio');
const cron = require('node-cron');
const express = require('express');
const Discord = require('discord.js');
const config = require('./config.json');
const { Webhook, MessageBuilder } = require('discord-webhook-node');

const hook = new Webhook({
  url: config.CHAT_WEBHOOK,
  throwErrors: false,
  retryOnLimit: false
});
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
            }
          });
          if (offer.link) {
            offers.push(offer);
          }
        }
      });
      //TODO: Adicionar tratamento de "categorias".
      offers.forEach(offer => {
        sendMessage(offer.description, offer.lowPrice, offer.store, offer.link);
      })
    }
    done();
  }
});

function sendMessage(title, price, store, link) {
  const webhookClient = new Discord.WebhookClient(config.WEBHOOK_ID, config.CHAT_WEBHOOK);
  console.log(webhookClient);

  const embed = new MessageBuilder()
    .setTitle(title)
    .setDescription(`Promoção cadastrada com valor de R$ ${price}, na loja ${store}`)
    .setFooter(`Link da promo: ${link}`)
    .setColor('#0099ff');

  hook.send(embed);
}

cron.schedule('* * 1 * *', function() {
  console.log('running a task every hour');
  // c.queue('https://www.promobit.com.br/');
});
c.queue('https://www.promobit.com.br/');

app.listen(3000);
