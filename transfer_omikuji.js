"use strict";

const request = require("request");

/**
 * 振込依頼APIを呼び出す
 * @param {string} sunabarToken
 * @param {string} transferDate
 * @param {number|string} amount
 */
function requestTransfer(sunabarToken, transferDate, amount) {
  const options = {
    method: "POST",
    url: "https://api.sunabar.gmo-aozora.com/personal/v1/transfer/request",
    headers: {
      Accept: "application/json;charset=UTF-8",
      "Content-Type": "application/json;charset=UTF-8",
      "x-access-token": sunabarToken,
    },
    json: {
      accountId: accountId,
      transferDesignatedDate: transferDate,
      transferDateHolidayCode: "1",
      totalCount: "1",
      totalAmount: String(amount),
      transfers: [
        {
          itemId: "1",
          transferAmount: String(amount),
          beneficiaryBankCode: "0310",
          beneficiaryBranchCode: "301",
          accountTypeCode: "1",
          accountNumber: "口座番号",
          beneficiaryName: "口座名",
        },
      ],
    },
  };

  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) return reject(error);

      if (response.statusCode >= 400) {
        return reject(body);
      }

      resolve(body);
    });
  });
}

module.exports = { requestTransfer };
