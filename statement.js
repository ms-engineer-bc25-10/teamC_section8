"use strict";

const request = require("request");
// const { getTodayJST } = require("./utils/date");
const { getTodayJST } = require("./date");
const accountId = process.env.accountId;
const sunabarToken = process.env.sunabarToken;

function getStatement() {
  console.log("getStatement 開始");
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
      if (error) {
        console.error("requestエラー:",error);
      return reject(error);}
        console.log("statusCode:400パラメーター不正401認証情報不足不正403認証成功権限なし", response.statusCode);
        console.log("response body:", JSON.stringify(body, null, 2));

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
