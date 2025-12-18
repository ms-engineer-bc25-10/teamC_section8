const request = require("request");

//今日の日付（JST）を作る
function getTodayJST() {
  const now = new Date();

  now.setHours(now.getHours() + 9);

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

const accountId = process.env.accountId;
const sunabarToken = process.env.sunabarToken;
const bankAccountNo = process.env.bankAccountNo;

exports.postLuckMoney = (transferData) => {
  return new Promise((resolve, reject) => {
    const amount = String(transferData.amount);
    const transferDate = getTodayJST();

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
        transferDesignatedDate: transferDate,
        transferDateHolidayCode: "1",
        totalCount: "1",
        totalAmount: amount,
        transfers: [
          {
            itemId: "1",
            transferAmount: amount,
            beneficiaryBankCode: "0310",
            beneficiaryBranchCode: "102",
            accountTypeCode: "1",
            accountNumber: bankAccountNo,
            beneficiaryName: "ﾀﾞｻﾞｲﾌ ﾃﾝﾏﾝｸﾞｳ",
          },
        ],
      }),
    };

    request(options, (error, response) => {
      if (error) {
        return reject(error);
      }
      if (response.statusCode >= 400) {
        return reject(new Error(response.body));
      }
      resolve(JSON.parse(response.body));
    });
  });
};
