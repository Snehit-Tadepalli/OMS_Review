const state = require("../utils/state");

const processInput = (input) => {
  const outputArray = [];

  input = input.map((item, i) => {
    let currentItem = item.trim();

    if (item.includes("https://www.openstreetmap.org/"))
      currentItem = item.split("https://www.openstreetmap.org/")[1].trim();

    if (currentItem.includes(" ")) currentItem = currentItem.split(" ")[0];

    outputArray.push(currentItem.trim());

    return item.trim();
  });

  state.input = input;
  state.features = outputArray;
  return input;
};

module.exports = processInput;
