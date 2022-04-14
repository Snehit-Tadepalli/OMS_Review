const express = require("express");
const app = express();

const input = require("./input");
const state = require("./utils/state");

const processInput = require("./utils/processInput");
const generateOutput = require("./utils/generateOutput");

const formatDate = (date, timeZone) => {
  const options = {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZone,
    timeZoneName: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour12: false
  };

  return Intl.DateTimeFormat("en-IN", options).format(date).toUpperCase();
};

app.set("json spaces", 4);

app.get("/", async (_, res) => {
  processInput(input);
  state.output = await generateOutput(state.features);
  res.send(`Requested at: ${formatDate(new Date(Date.now()), "Asia/Kolkata")}`);
});

app.listen({ port: 8080 }, () => console.log(`Server running at port: 8080`));
