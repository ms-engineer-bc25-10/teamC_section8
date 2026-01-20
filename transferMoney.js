"use strict";

var request = require("request");
const sunabarToken = process.env.sunabarToken;
const accountId = process.env.accountId;
const bankAccountNo = process.env.bankAccountNo;

// 今日の日付を取得
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
const formattedDate = `${yyyy}-${mm}-${dd}`;

function transferMoney(money) {
  const options = {
    method: "POST",
    url: "https://api.sunabar.gmo-aozora.com/personal/v1/transfer/request",
    headers: {
      Accept: "application/json;charset=UTF-8",
      "Content-Type": "application/json;charset=UTF-8",
      "x-access-token": sunabarToken,
    },
    body: JSON.stringify({
      accountId: accountId,
      transferDesignatedDate: formattedDate,
      transferDateHolidayCode: "1",
      totalCount: "1",
      totalAmount: money,
      transfers: [
        {
          itemId: "1",
          transferAmount: money,
          beneficiaryBankCode: "0310",
          beneficiaryBranchCode: "302",
          accountTypeCode: "1",
          accountNumber: bankAccountNo,
          beneficiaryName: "ﾀﾞｻﾞｲﾌ ﾃﾝﾏﾝｸﾞｳ",
        },
      ],
    }),
  };

  return new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if (error) {
        return reject(error);
      }

      const body = JSON.parse(response.body);
      console.log(body);
      resolve(body);
    });
  });
}

module.exports = { transferMoney };
