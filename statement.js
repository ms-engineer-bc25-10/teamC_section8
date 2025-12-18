"use strict";

const request = require("request");
// const { getTodayJST } = require("./utils/date");
const { getTodayJST } = require("./date");
const accountId = process.env.accountId;
const sunabarToken = process.env.sunabarToken;

function getStatement() {
  const options = {
    method: "GET",
    url: "https://api.sunabar.gmo-aozora.com/personal/v1/accounts/transactions",
    qs: {
      accountId: accountId,
      dateFrom: "2024-03-24",
      dateTo: getTodayJST(),
      nextItemKey: 0,
    },
    headers: {
      Accept: "application/json;charset=UTF-8",
      "Content-Type": "application/json;charset=UTF-8",
      "x-access-token": sunabarToken,
    },
    json: true,
  };

  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) return reject(error);
      if (response.statusCode !== 200) {
        return reject({
          statusCode: response.statusCode,
          body,
        });
      }
      resolve(body);
    });
  });
}

exports.getStatement = getStatement;
