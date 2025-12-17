"use strict";

var request = require("request");
const sunabarToken = process.env.sunabarToken;
const accountId = process.env.accountId;

function getDetail(applyNo) {
  const options = {
    method: "GET",
    url:
      "https://api.gmo-aozora.com/ganb/api/simulator/personal/v1/transfer/request-result?accountId=" +
      accountId +
      "&applyNo=" +
      applyNo,
    headers: {
      Accept: "application/json;charset=UTF-8",
      "Content-Type": "application/json;charset=UTF-8",
      "x-access-token": sunabarToken,
    },
  };

  return new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if (error) {
        return reject(error);
      }

      const data = JSON.parse(response.body);
      console.log(data);
      resolve(data.resultCode);
    });
  });
}

module.exports = { getDetail };
