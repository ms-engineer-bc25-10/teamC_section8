"use strict";

const request = require("request");
const { getTodayJST, getDateJSTDaysAgo } = require("./date");

const NORMAL_ACCOUNT_ID = process.env.accountId;
const NORMAL_TOKEN = process.env.sunabarToken;

// 大宰府用口座
const DAZAIFU_ACCOUNT_ID = process.env.bankAccountNo;
const DAZAIFU_TOKEN = process.env.sunabarToken2;

function getStatement(type = "today") {
  console.log("getStatement 開始 type:", type);

  let accountId;
  let token;
  let dateFrom;
  const dateTo = getTodayJST();

  // ---- type による切替 ----
  switch (type) {
    case "today":
      accountId = NORMAL_ACCOUNT_ID;
      token = NORMAL_TOKEN;
      dateFrom = getTodayJST();
      break;

    case "3days":
      accountId = NORMAL_ACCOUNT_ID;
      token = NORMAL_TOKEN;
      dateFrom = getDateJSTDaysAgo(3);
      break;

    case "thisWeek":
      accountId = NORMAL_ACCOUNT_ID;
      token = NORMAL_TOKEN;
      dateFrom = getDateJSTDaysAgo(7);
      break;

    case "dazaifu":
      accountId = DAZAIFU_ACCOUNT_ID;
      token = DAZAIFU_TOKEN;
      dateFrom = getDateJSTDaysAgo(30); // ← 大宰府は30日分
      break;

    default:
      accountId = NORMAL_ACCOUNT_ID;
      token = NORMAL_TOKEN;
      dateFrom = getTodayJST();
  }

  const options = {
    method: "GET",
    url: "https://api.sunabar.gmo-aozora.com/personal/v1/accounts/transactions",
    qs: {
      accountId,
      dateFrom,
      dateTo,
      nextItemKey: 0,
    },
    headers: {
      Accept: "application/json;charset=UTF-8",
      "Content-Type": "application/json;charset=UTF-8",
      "x-access-token": token,
    },
    json: true,
  };

  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        console.error("reguestエラー:", error);
        return reject(error);
      }
      console.log(
        "（200成功400パラメーター不正401認証情報不足不正403認証成功権限なし）statusCode:",
        response.statusCode
      );
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
