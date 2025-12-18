"use strict";

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

  const body = JSON.parse(event.body);
  const replyToken = body.events[0].replyToken;
  const reqMessage = body.events[0].message.text;
  let resMessage = "";

  // *** 振り込みapplyNO確認変数 ***
  const userId = JSON.parse(event.body).events[0].source.userId;

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
