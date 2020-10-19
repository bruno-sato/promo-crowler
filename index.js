var Crawler = require("crawler");
const cheerio = require('cheerio');

 
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
        // console.log(offers);
      });
    }
    done();
  }
});
c.queue('https://www.promobit.com.br/');