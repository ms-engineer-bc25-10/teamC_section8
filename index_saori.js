"use strict";
var request = require("request");
const line = require("@line/bot-sdk");
const { getBalance } = require("./get_balance");
const { postLuckMoney } = require("./post_luckmoney");

const config = {
    channelSecret: process.env.channelSecretLINE,
    channelAccessToken: process.env.channelAccessTokenLINE,
};
const client = new line.Client(config);

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
    "善光寺（お参り）": "BANK_F"
};
const BANK_LABEL_MAP = {
    BANK_A: "太宰府天満宮（お参り）",
    BANK_B: "防府天満宮（お参り）",
    BANK_C: "北野天満宮（お参り）",
    BANK_D: "出雲大社（お参り）",
    BANK_E: "湯島天神（お参り）",
    BANK_F: "善光寺（お参り）"
};


exports.handler = async (event) => {
    const eventData = JSON.parse(event.body).events[0];
    const replyToken = eventData.replyToken;
    const reqMessage = eventData.type === "message" ? eventData.message.text : null;
    const userId = eventData.source.userId;
    let resMessage = "";

    console.log("受信メッセージ：", reqMessage);

    //残高
    if (reqMessage == "残高") {
        try {
            const balanceData = await getBalance();
            const balance = balanceData.balances[0].balance;
            const formattedBalance = Number(balance).toLocaleString("ja-JP");

            return client.replyMessage(replyToken, {
                type: "text",
                text: `残高は${formattedBalance}円です`,
            })
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
            step: STEP.WAIT_ACCOUNT
        };
        return;
    }
    //神社名がきた
    if (
        eventData.type === "message" &&
        BANK_TEXT_TO_CODE[reqMessage]
    ) {
        const userId = eventData.source.userId;
        const replyToken = eventData.replyToken;

        tempTransferData[userId] = {
            bank: BANK_TEXT_TO_CODE[reqMessage],
            step: "WAIT_AMOUNT"
        };

        return client.replyMessage(replyToken, {
            type: "text",
            text: "納付金額を入力してください（例:100円）"
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
        const amountText = Number(tempTransferData[userId].amount).toLocaleString("ja-JP");
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
                    }
                ],
            },
        });
    }
    //納付確認「はい」
    if (
        tempTransferData[userId]?.step === STEP.CONFIRM && reqMessage === "はい"
    ) {
        try {
            const transferData = tempTransferData[userId];
            await postLuckMoney(transferData);

            tempTransferData[userId].step = STEP.WAIT_AUTH_CONFIRM;
            const bankLabel = BANK_LABEL_MAP[tempTransferData[userId].bank];
            const amountText = Number(tempTransferData[userId].amount).toLocaleString("ja-JP");

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
                            }
                        }
                    ]
                }
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
        tempTransferData[userId]?.step === STEP.CONFIRM && reqMessage === "いいえ"
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
            text:
                "✨チャリーン✨\n\n" +
                "合格祈願！！！",
        });
    }
    //リッチメニューにない言葉が入力された時
    else {
        return client.replyMessage(replyToken, {
            type: "text",
            text: "お参り、お守り、おみくじ、履歴確認から選んでください",
        });
    }
};





