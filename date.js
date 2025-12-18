"use strict";

// 日本時間で今日（YYYY-MM-DD）を返す
function getTodayJST() {
  const now = new Date();
  now.setHours(now.getHours() + 9);
  return now.toISOString().slice(0, 10);
}

module.exports = {
  getTodayJST,
};
