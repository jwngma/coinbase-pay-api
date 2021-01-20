var express = require("express");
var port = process.env.PORT || 3000;
var app = express();

var Client = require("coinbase").Client;

var client = new Client({
  apiKey: "", // You can get this from your Coinbase account
  apiSecret: "", // You can get this from your Coinbase account
  version: "", // You can get this from your Coinbase account
});

//This is what you have to complete to get this project, if you qualify this, you are elegiblefor the project
//Send Funds api using coinbase email addres
// we can use any  email associated to coinbase account to send any coin supported in coinbase
app.post("/paycrypto", function (req, res) {
  client.getAccount("primary", function (err, account) {
    client.getAccount("primary", function (err, account) {
      account.sendMoney(
        {
          to: req.params.email,
          amount: req.params.amount,
          currency: req.params.currency,
        },
        function (err, tx) {
          console.log(tx);
          //complete the response
        }
      );
    });
  });
});
app.listen(port, function () {
  console.log(`Example app listening on port 3000`);
});
