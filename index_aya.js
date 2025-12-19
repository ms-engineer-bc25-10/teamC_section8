"use strict";

// *** 独自関数呼び出し+その他（ayaさん） ***
// const { getBalance } = require("./balance");
// const { postTransfer } = require("./transfer");
// const userStatus = {};
// const { getTodayJST } = require("./date");
const { getStatement } = require("./statement");
const { replyText, replyTextWithQuickReply } = require("./lineReply");
const { getDateJSTDaysAgo } = require("./date");

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
  console.log("履歴一覧リクエストきたよ");

// このユーザーは「履歴の期間選択中」
userStatus[userId] = {
  mode: "HISTORY_SELECT"
};

  await replyTextWithQuickReply(
    replyToken,
    "履歴を確認したい期間を選んでください。",
    [
      { label: "今日", text: "期間:今日" },
      { label: "３日間", text: "期間:３日間" },
      { label: "今週", text: "期間:今週" }
    ]
  );

  return { statusCode: 200, body: "OK" };
}

// 期間選択 ("userStatusがHISTORY_SELECTの場合のみ）
if (
  userStatus[userId]?.mode === "HISTORY_SELECT" &&
  reqMessage?.startsWith("期間:")
) { 
  console.log("期間選択リクエスト:", reqMessage);

  const period = reqMessage.replace("期間:", "").trim();
  let dateFrom;
  const dateTo = getTodayJST();

  switch (period) {
    case "今日":
      dateFrom = getTodayJST();
      break;
    case "３日間":
      dateFrom = getDateJSTDaysAgo(3);
      break;
    case "今週":
      dateFrom = getDateJSTDaysAgo(7);
      break;
    default:
      console.log("選択肢以外の期間:", period);
      dateFrom = getTodayJST();
  }

  console.log("日付範囲", { dateFrom, dateTo });

  try {
    const statement = await getStatement(dateFrom, dateTo);

    console.log(
      "表示対象(type=2)",
      statement.transactions
        .filter(tx => String(tx.transactionType) === "2")
        .map(tx => tx.transactionDate)
    );

    const text = statement.transactions
      .filter(tx => String(tx.transactionType) === "2")
      .filter(tx => tx.transactionDate >= dateFrom && tx.transactionDate <= dateTo)
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
      .slice(0, 5)
      .map(tx =>
        `📅 ${tx.transactionDate}\n💴 ${Math.abs(Number(tx.amount))}円\n📝 ${tx.remarks ?? "（摘要なし）"}`
      )
      .join("\n\n");

    await replyText(replyToken, text || "履歴がありません");
    return { statusCode: 200, body: "OK" };

  } catch (err) {
    console.error("履歴取得に失敗:", err);
    await replyText(replyToken, "履歴の取得に失敗しました");
  
    //状態を消す
    delete userStatus[userId];
    return { statusCode: 500, body: "NG" };
  }
}
