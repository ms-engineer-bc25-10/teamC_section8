"use strict";

// *** 独自関数呼び出し+その他（ayaさん） ***
// const { getBalance } = require("./balance");
// const { postTransfer } = require("./transfer");
const { getStatement } = require("./statement");
const { replyText } = require("./lineReply");

// *** 独自関数呼び出し+その他（さおりんさん） ***
const { getBalance } = require("./get_balance");
const { postLuckMoney } = require("./transfer_omairi");
//会話の途中状態を一時的に持つ箱
let tempTransferData = {};
// step 定義
const STEP = {
  WAIT_ACCOUNT: "WAIT_ACCOUNT",
  WAIT_AMOUNT: "WAIT_AMOUNT",
  CONFIRM: "CONFIRM",
  WAIT_AUTH_CONFIRM: "WAIT_AUTH_CONFIRM",
};
//神社一覧
const BANK_TEXT_TO_CODE = {
  "太宰府天満宮（お参り）": "BANK_A",
  "防府天満宮（お参り）": "BANK_B",
  "北野天満宮（お参り）": "BANK_C",
  "出雲大社（お参り）": "BANK_D",
  "湯島天神（お参り）": "BANK_E",
  "善光寺（お参り）": "BANK_F",
};
const BANK_LABEL_MAP = {
  BANK_A: "太宰府天満宮（お参り）",
  BANK_B: "防府天満宮（お参り）",
  BANK_C: "北野天満宮（お参り）",
  BANK_D: "出雲大社（お参り）",
  BANK_E: "湯島天神（お参り）",
  BANK_F: "善光寺（お参り）",
};

// *** 独自関数呼び出し+その他（ゆりさん） ***
const { drawOmikuji } = require("./omikuji");
const { requestTransfer } = require("./transfer_omikuji");

// *** 独自関数呼び出し+その他（ひろ） ***
const { transferMoney } = require("./transferMoney");
const { getDetail } = require("./getDetail");
const userStatus = {};

// *** 日本時間取得 ***
// 日本時間(JST)で「今日の日付 YYYY-MM-DD」を返す
function getTodayJST() {
  //「今」の日時を作る(Lambda/サーバーではUTC(世界標準時)になることが多い)
  const now = new Date();
  //今の時刻をミリ秒に変換,日本はUTC+9時間
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  //YYYY-MM-DD形式に整形する(ISO形式の文字列に変換+先頭10文字だけ切り出す)
  return jst.toISOString().slice(0, 10);
}

// *** 共通 ***
var request = require("request");
const line = require("@line/bot-sdk");
const config = {
  channelSecret: process.env.channelSecretLINE,
  channelAccessToken: process.env.channelAccessTokenLINE,
};
const client = new line.Client(config);
// const sunabarToken = process.env.sunabarToken;

// LINEからのイベントが届いたら発動
exports.handler = async (event) => {
  console.log(event);

  const eventData = JSON.parse(event.body).events[0];
  const body = JSON.parse(event.body);
  const replyToken = body.events[0].replyToken;
  // const reqMessage = body.events[0].message.text;
  const reqMessage =
    eventData.type === "message" ? eventData.message.text : null;
  let resMessage = "";

  // *** 振り込みapplyNO確認変数 ***
  // const userId = JSON.parse(event.body).events[0].source.userId;
  const userId = eventData.source.userId;

  // *** 履歴一覧 ***
  if (reqMessage === "履歴一覧") {
    const statement = await getStatement();

    const text = statement.transactions
      .filter((tx) => tx.transactionType === "2")
      .slice(0, 5) //直近5件
      .map((tx) => {
        const amount = Math.abs(tx.amount);
        const result = `📅${tx.transactionDate}
      💴${amount}円
      📝${tx.remarks ?? ""}`;
        return result;
      })
      .join("\n\n");

    await replyText(replyToken, text);
  }

  // *** お参り ***
  //残高
  if (reqMessage == "残高") {
    try {
      const balanceData = await getBalance();
      const balance = balanceData.balances[0].balance;
      const formattedBalance = Number(balance).toLocaleString("ja-JP");

      return client.replyMessage(replyToken, {
        type: "text",
        text: `残高は${formattedBalance}円です`,
      });
    } catch (error) {
      return client.replyMessage(replyToken, {
        type: "text",
        text: "残高取得に失敗しました",
      });
    }
  }
  //お参りスタート
  if (reqMessage == "お参り") {
    tempTransferData[userId] = {
      step: STEP.WAIT_ACCOUNT,
    };
    return;
  }
  //神社名がきた
  if (eventData.type === "message" && BANK_TEXT_TO_CODE[reqMessage]) {
    const userId = eventData.source.userId;
    const replyToken = eventData.replyToken;

    tempTransferData[userId] = {
      bank: BANK_TEXT_TO_CODE[reqMessage],
      step: "WAIT_AMOUNT",
    };

    return client.replyMessage(replyToken, {
      type: "text",
      text: "納付金額を入力してください（例:100円）",
    });
  }
  //納付額を入力
  if (tempTransferData[userId]?.step === STEP.WAIT_AMOUNT) {
    const userId = eventData.source.userId;
    const replyToken = eventData.replyToken;
    const amount = parseInt(
      reqMessage.replace(/円/g, "").replace(/,/g, ""),
      10
    );

    if (isNaN(amount) || amount <= 0) {
      return client.replyMessage(replyToken, {
        type: "text",
        text: "納付額は「100円」のように入力してください",
      });
    }
    tempTransferData[userId].amount = amount;
    tempTransferData[userId].step = STEP.CONFIRM;

    const bankLabel = BANK_LABEL_MAP[tempTransferData[userId].bank];
    const amountText = Number(tempTransferData[userId].amount).toLocaleString(
      "ja-JP"
    );
    const confirmMassage =
      `⛩️以下の内容で納付しますか？\n\n` +
      `【納付先】\n${bankLabel}\n\n` +
      `【金額】\n${amountText}円`;

    return client.replyMessage(replyToken, {
      type: "text",
      text: confirmMassage,
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "message",
              label: "はい",
              text: "はい",
            },
          },
          {
            type: "action",
            action: {
              type: "message",
              label: "いいえ",
              text: "いいえ",
            },
          },
        ],
      },
    });
  }
  //納付確認「はい」
  if (
    tempTransferData[userId]?.step === STEP.CONFIRM &&
    reqMessage === "はい"
  ) {
    try {
      const transferData = tempTransferData[userId];
      await postLuckMoney(transferData);

      tempTransferData[userId].step = STEP.WAIT_AUTH_CONFIRM;
      const bankLabel = BANK_LABEL_MAP[tempTransferData[userId].bank];
      const amountText = Number(tempTransferData[userId].amount).toLocaleString(
        "ja-JP"
      );

      const message =
        `💰 納付受付を行いました。\n\n` +
        `ログイン後パスワードを入力して納付手続きを完了してください。\n\n` +
        `【振込先】\n${bankLabel}\n\n` +
        `【金額】\n${amountText}円\n\n` +
        `【ログイン先】https://portal.sunabar.gmo-aozora.com/login`;

      return client.replyMessage(replyToken, {
        type: "text",
        text: message,
        quickReply: {
          items: [
            {
              type: "action",
              action: {
                type: "message",
                label: "納付完了しました",
                text: "納付完了しました",
              },
            },
          ],
        },
      });
    } catch (error) {
      console.error(error);
      return client.replyMessage(replyToken, {
        type: "text",
        text: "納付に失敗しました",
      });
    }
  }
  //納付確認「いいえ」
  if (
    tempTransferData[userId]?.step === STEP.CONFIRM &&
    reqMessage === "いいえ"
  ) {
    delete tempTransferData[userId];
    return client.replyMessage(replyToken, {
      type: "text",
      text: "納付をキャンセルしました",
    });
  }
  //納付完了、合格祈願
  if (
    tempTransferData[userId]?.step === STEP.WAIT_AUTH_CONFIRM &&
    reqMessage === "納付完了しました"
  ) {
    delete tempTransferData[userId];
    return client.replyMessage(replyToken, {
      type: "text",
      text: "✨チャリーン✨\n\n" + "合格祈願！！！",
    });
  }

  // すみません、ここは思うように動かなかったので一旦コメントアウトしています（ひろ）
  //リッチメニューにない言葉が入力された時
  // else {
  //   return client.replyMessage(replyToken, {
  //     type: "text",
  //     text: "お参り、お守り、おみくじ、履歴確認から選んでください",
  //   });
  // }

  // *** おみくじ ***
  if (reqMessage === "太宰府天満宮（おみくじ）") {
    return client.replyMessage(replyToken, {
      type: "text",
      text: "⛩ 太宰府天満宮のおみくじです。\n料金は100円です。",
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "message",
              label: "100円でおみくじを引く",
              text: "100円でおみくじを引く",
            },
          },
        ],
      },
    });
  }
  if (reqMessage === "100円でおみくじを引く") {
    try {
      const transferDate = getTodayJST();
      const amount = 100;

      const result = await requestTransfer(
        process.env.sunabarToken,
        transferDate,
        amount
      );

      console.log("振込API結果:", result);

      return client.replyMessage(replyToken, {
        type: "text",
        text:
          "振込み受付を行いました。\n\n" +
          "ログインして\n" +
          "振込みを完了してください。\n\n" +
          "https://sso.sunabar.gmo-aozora.com/b2c/login",
      });
    } catch (err) {
      console.error("振込エラー:", err);
      return client.replyMessage(replyToken, {
        type: "text",
        text: "振込受付に失敗しました",
      });
    }
  }
  if (reqMessage === "振込完了") {
    return client.replyMessage(replyToken, {
      type: "text",
      text:
        "振込みを確認できました。\n" +
        "おみくじの結果です 🎯\n\n" +
        "           ↓  ↓  ↓ \n\n\n\n" +
        "           ↓  ↓  ↓ \n\n\n\n" +
        "           ↓  ↓  ↓ \n\n\n\n" +
        "      ◆太宰府天満宮◆\n" +
        "             おみくじ\n" +
        drawOmikuji(),
    });
  }

  console.log(resMessage);

  // *** お守り ***
  if (reqMessage == "太宰府天満宮（お守り）") {
    resMessage = "お守りの代金は1000円です";
    return client.replyMessage(replyToken, {
      type: "text",
      text: resMessage,
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "message",
              label: "1000円を振り込む",
              text: "1000円を振り込む",
            },
          },
        ],
      },
    });
  } else if (reqMessage.includes("振り込む")) {
    try {
      // 入力されたテキストから金額のみを取得
      const money = reqMessage.match(/\d+/g).join("");
      console.log(money);

      // 引数に金額を設定して、振込依頼APIを発動
      const result = await transferMoney(money);

      // 振り込みAPIからレスポンスから「applyNo」を格納
      userStatus[userId] = {
        applyNo: result.applyNo,
      };
      console.log(userStatus[userId]);

      resMessage =
        "振り込み受け付けを行いました。\nログインをしてパスワードを入力して振り込み手続きを完了してください。\nhttps://sso.sunabar.gmo-aozora.com/b2c/login";
      return client.replyMessage(replyToken, {
        type: "text",
        text: resMessage,
        quickReply: {
          items: [
            {
              type: "action",
              action: {
                type: "message",
                label: "振り込みました",
                text: "振り込みました",
              },
            },
          ],
        },
      });
    } catch (err) {
      console.error(err);
      return client.replyMessage(replyToken, {
        type: "text",
        text: "送金に失敗しました",
      });
    }
  } else if (reqMessage == "振り込みました") {
    try {
      // 「applyNo」を引数に、振込依頼結果紹介APIを発動
      console.log(userStatus[userId].applyNo);

      const result = await getDetail(userStatus[userId].applyNo);
      console.log(result);

      // resultに格納されている数字が「1(完了)」であるか確認
      // 「2」は未完了
      // 「8」は期限切れ
      if (result == 1) {
        resMessage = "振り込みが確認できました。\nお守りをお渡しします。";
        delete userStatus[userId];
        return client.replyMessage(replyToken, [
          {
            type: "text",
            text: resMessage,
          },
          {
            type: "image",
            originalContentUrl: "https://i.ibb.co/Q36F0Mfs/omamori-goukaku.png",
            previewImageUrl: "https://i.ibb.co/Q36F0Mfs/omamori-goukaku.png",
          },
        ]);
      } else {
        resMessage =
          "振り込みが確認できませんでした。\n再度振り込みの認証ができているかご確認ください。";
        return client.replyMessage(replyToken, [
          {
            type: "text",
            text: resMessage,
            quickReply: {
              items: [
                {
                  type: "action",
                  action: {
                    type: "message",
                    label: "振り込みました",
                    text: "振り込みました",
                  },
                },
              ],
            },
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      return client.replyMessage(replyToken, {
        type: "text",
        text: "確認に失敗しました",
      });
    }
  }
};
