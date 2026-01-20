const request = require("request");
const sunabarToken = process.env.sunabarToken;
exports.getBalance = () => {
  return new Promise((resolve, reject) => {
    var options = {
      method: "GET",
      url: "https://api.sunabar.gmo-aozora.com/personal/v1/accounts/balances",
      headers: {
        Accept: "application/json;charset=UTF-8",
        "Content-Type": "application/json;charset=UTF-8",
        "x-access-token": sunabarToken,
      },
    };

    request(options, (error, response) => {
      if (error) {
        reject(error);
        return;
      }
      if (response.statusCode != 200) {
        reject(new Error(`status ${response.statusCode}: ${response.body}`));
        return;
      }
      try {
        const data = JSON.parse(response.body);
        resolve(data);
      } catch (e) {
        reject(e);
      }
    });
  });
};
