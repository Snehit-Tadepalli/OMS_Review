const scraper = require("../scraper");
const distance = require("../distance");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const checkDuplicates = async (input) => {
  const preCondition =
    input.type !== "node" ||
    !input.hasOwnProperty("tags") ||
    !input.tags.hasOwnProperty("name");

  if (preCondition) return `, doesn't have name tag to check for duplicates`;

  const { lat, lon: lng } = input;
  const name = input.tags.name;

  const change = 0.01; // `0.01` is equal to `1km`
  const range = change * 100;

  const boundingBox = {
    southLat: +lat - +change,
    westLng: +lng - +change,
    northLat: +lat + +change,
    eastLng: +lng + +change
  };

  const { southLat, westLng, northLat, eastLng } = boundingBox;

  const servers = {
    main: `https://www.overpass-api.de/api/interpreter`,
    kumi: `https://overpass.kumi.systems/api/interpreter`
  };

  const { kumi } = servers;

  const filters = `[name][place]`;
  const bbox = `nwr(${southLat},${westLng},${northLat},${eastLng})${filters};`;
  const url = `${kumi}?data=[out:json][timeout:50000];${bbox}out%20meta;`;

  try {
    const request = await fetch(url);

    const data = await request.json();
    const { elements } = data;

    const duplicates = [];

    elements.forEach((item) => {
      if (
        item.type === "node" &&
        item.hasOwnProperty("tags") &&
        (item.tags.hasOwnProperty("place") ||
          item.tags.hasOwnProperty("boundary") ||
          item.tags.hasOwnProperty("admin_level")) &&
        item.tags.hasOwnProperty("name") &&
        item.tags.name === name
      )
        duplicates.push(item.tags.name);
    });

    if (duplicates.length === 0) {
      return ", invalid place name to check for duplicates";
    }

    if (duplicates.length === 1) {
      return `, no duplicates with in ${range}km range`;
    }

    const duplicatesCount = duplicates.length - 1;
    return `, have ${duplicatesCount} duplicate${
      duplicatesCount > 1 ? "s" : ""
    } within ${range}km range`;
  } catch (e) {
    console.log(`Failed to check duplicates for ${input.type}/${input.id}`);
    return `, server error while checking duplicates`;
  }
};

// const forRelation = async (output) => {
//   if (output.tags.type === "multipolygon") {
//     return `${output.type}/${output.id}, is of v${output.version} and is of type multipolygon`;
//   }

//   const scraperOutput = await scraper(+output.id);

//   if (scraperOutput === 1) {
//     return `${output.type}/${output.id}, is of v${output.version} and the status is good`;
//   }

//   if (scraperOutput === 0) {
//     return `${output.type}/${output.id}, is of v${output.version} and the status is bad`;
//   }

//   return `${output.type}/${output.id}, Relation analyzer failed to respond`;
// };

const checkTagChanges = async (prevTags, newTags) => {
  const prevTagsKeys = Object.keys(prevTags);
  const newTagsKeys = Object.keys(newTags);

  // No tag changes condition
  if (prevTags.length === newTags.length) {
    const prevTagsString = prevTagsKeys
      .sort()
      .map((item) => `${item}: ${prevTags[item]}`)
      .join(" ");

    const newTagsString = newTagsKeys
      .sort()
      .map((item) => `${item}: ${newTags[item]}`)
      .join(" ");

    if (prevTagsString === newTagsString) {
      return `no [name/place] tag changes`;
    }
  }

  const finalString = [];

  if (prevTags.hasOwnProperty("name") && newTags.hasOwnProperty("name")) {
    if (prevTags.name !== newTags.name) {
      finalString.push(
        `name is changed from [${prevTags.name} -> ${newTags.name}]`
      );
    }
  }

  if (prevTags.hasOwnProperty("place") && newTags.hasOwnProperty("place")) {
    if (prevTags.place !== newTags.place) {
      finalString.push(
        `place is changed from [${prevTags.place} -> ${newTags.place}]`
      );
    }
  }

  if (prevTags.hasOwnProperty("name") && !newTags.hasOwnProperty("name")) {
    finalString.push(`name tag with value [${prevTags.name}] is removed`);
  }

  if (!prevTags.hasOwnProperty("name") && newTags.hasOwnProperty("name")) {
    finalString.push(`name tag with value [${newTags.name}] is added`);
  }

  if (prevTags.hasOwnProperty("place") && !newTags.hasOwnProperty("place")) {
    finalString.push(`place tag with value [${prevTags.place}] is removed`);
  }

  if (!prevTags.hasOwnProperty("place") && newTags.hasOwnProperty("place")) {
    finalString.push(`place tag with value [${newTags.place}] is added`);
  }

  if (finalString.join(", ").length === 0) {
    return `tags otherthan [name/place] are changed`;
  }

  return finalString.join(", ");
};

const forVersion1 = async (output) => {
  // For node and way
  if (output.type === "node" || output.type === "way") {
    return `${output.type}/${output.id}, is of v1`;
  }

  // For relation
  if (output.type === "relation") {
    if (output.tags.type === "multipolygon") {
      return `${output.type}/${output.id}, is of v${output.version} and is of type multipolygon`;
    }

    const scraperOutput = await scraper(+output.id);

    if (scraperOutput === 1) {
      return `${output.type}/${output.id}, is of v${output.version} and the status is good`;
    }

    if (scraperOutput === 0) {
      return `${output.type}/${output.id}, is of v${output.version} and the status is bad`;
    }

    return `${output.type}/${output.id}, Relation analyzer failed to respond`;
  }
};

const forVersionGreaterThan1 = async (output) => {
  // For relation
  if (output.type === "relation") {
    const url = `https://api.openstreetmap.org/api/0.6/${
      output.type
    }/${+output.id}/history.json`;

    const history = await fetch(url);
    const response = await history.json();

    const previousVersion = response.elements[response.elements.length - 2];
    const latestVersion = response.elements[response.elements.length - 1];

    let [membersChanged, tagsChanged] = [false, false];

    // Check for members changes
    if (previousVersion.members.length === latestVersion.members.length) {
      const prevMembers = previousVersion.members;
      const latestMembers = latestVersion.members;

      const lengthToCheck = prevMembers.length;

      for (let i = 0; i < lengthToCheck; i++) {
        if (
          prevMembers[i].type !== latestMembers[i].type ||
          prevMembers[i].ref !== latestMembers[i].ref ||
          prevMembers[i].role !== latestMembers[i].role
        ) {
          membersChanged = true;
          break;
        }
      }
    } else {
      membersChanged = true;
    }

    // Check for tag changes
    if (previousVersion.tags.length === latestVersion.tags.length) {
      const prevKeys = Object.keys(previousVersion.tags).sort();
      const prevValues = Object.values(previousVersion.tags).sort();
      const latestKeys = Object.keys(latestVersion.tags).sort();
      const latestValues = Object.values(latestVersion.tags).sort();

      const lengthToCheck = prevKeys.length;

      for (let i = 0; i < lengthToCheck; i++) {
        if (
          prevKeys[i] !== latestKeys[i] ||
          prevValues[i] !== latestValues[i]
        ) {
          tagsChanged = true;
          break;
        }
      }
    } else {
      tagsChanged = true;
    }

    let tagAndMemberChanges = ``;

    if (membersChanged && tagsChanged) {
      tagAndMemberChanges = "both tags & members are changed";
    } else if (membersChanged) {
      tagAndMemberChanges = "only members changed";
    } else if (tagsChanged) {
      tagAndMemberChanges = "only tags changed";
    } else {
      tagAndMemberChanges = "error checking tags & members changes";
    }

    if (output.tags.type === "multipolygon") {
      return `${output.type}/${output.id}, is of v${output.version}, ${tagAndMemberChanges}, type is multipolygon`;
    }

    const scraperOutput = await scraper(+output.id);

    if (scraperOutput === 1) {
      return `${output.type}/${output.id}, is of v${output.version}, ${tagAndMemberChanges}, status is good`;
    }

    if (scraperOutput === 0) {
      return `${output.type}/${output.id}, is of v${output.version}, ${tagAndMemberChanges}, status is bad`;
    }

    return `${output.type}/${output.id}, Relation analyzer failed to respond`;
  }

  // for node
  if (output.type === "node") {
    const url = `https://api.openstreetmap.org/api/0.6/${
      output.type
    }/${+output.id}/history.json`;

    const history = await fetch(url);
    const response = await history.json();

    const itemsArr = response.elements;

    const previousVersion = itemsArr[itemsArr.length - 2];
    const latestVersion = itemsArr[itemsArr.length - 1];

    const origin = { lat: previousVersion.lat, lon: previousVersion.lon };
    const destination = {
      lat: latestVersion.lat,
      lon: latestVersion.lon
    };

    const distanceCalc = await distance(origin, destination);

    const tagsChanged = await checkTagChanges(
      previousVersion.tags,
      latestVersion.tags
    );

    const duplicateStatus = await checkDuplicates(output);

    const placeType = `${
      latestVersion.tags.place ? latestVersion.tags.place : "NO-NAME"
    }`;

    if (distanceCalc <= 0 && tagsChanged !== null && duplicateStatus !== "") {
      return `${output.type}/${output.id}, is of v${itemsArr.length} and ${tagsChanged}${duplicateStatus}`;
    }

    if (distanceCalc <= 100 && tagsChanged !== null && duplicateStatus !== "") {
      return `${output.type}/${output.id}, is of v${itemsArr.length}, [place: ${placeType}] is moved for ${distanceCalc}m (within Threshold) and ${tagsChanged}${duplicateStatus}`;
    }

    if (distanceCalc > 100 && tagsChanged !== null && duplicateStatus !== "") {
      return `${output.type}/${output.id}, is of v${itemsArr.length}, [place: ${placeType}] moved for ${distanceCalc}m and ${tagsChanged}${duplicateStatus}`;
    }

    return `${output.type}/${output.id}, is of v${itemsArr.length}, need to investigate`;
  }

  // For way
  if (output.type === "way") {
    const url = `https://api.openstreetmap.org/api/0.6/${
      output.type
    }/${+output.id}/history.json`;

    const history = await fetch(url);
    const response = await history.json();
    const previousVersion = response.elements[response.elements.length - 2];
    const latestVersion = response.elements[response.elements.length - 1];

    let [nodesChanged, tagsChanged] = [false, false];

    // Check for geometry changes
    if (previousVersion.nodes.length === latestVersion.nodes.length) {
      const prevNodes = previousVersion.nodes.sort();
      const latestNodes = latestVersion.nodes.sort();

      const lengthToCheck = prevNodes.length;

      for (let i = 0; i < lengthToCheck; i++) {
        if (prevNodes[i] !== latestNodes[i]) {
          nodesChanged = true;
          break;
        }
      }
    } else {
      nodesChanged = true;
    }

    // Check for tag changes
    if (
      previousVersion.tags !== undefined &&
      previousVersion.tags.length === latestVersion.tags.length
    ) {
      const prevKeys = Object.keys(previousVersion.tags).sort();
      const prevValues = Object.values(previousVersion.tags).sort();
      const latestKeys = Object.keys(latestVersion.tags).sort();
      const latestValues = Object.values(latestVersion.tags).sort();

      const lengthToCheck = prevKeys.length;

      for (let i = 0; i < lengthToCheck; i++) {
        if (
          prevKeys[i] !== latestKeys[i] ||
          prevValues[i] !== latestValues[i]
        ) {
          tagsChanged = true;
          break;
        }
      }
    } else {
      tagsChanged = true;
    }

    if (nodesChanged && tagsChanged) {
      return `${output.type}/${output.id}, is of v${output.version}, both tags & geometry are changed`;
    }

    if (tagsChanged) {
      return `${output.type}/${output.id}, is of v${output.version}, only tags changed`;
    }

    if (nodesChanged) {
      return `${output.type}/${output.id}, is of v${output.version}, only geometry changed`;
    }

    return `${output.type}/${output.id}, is of v${output.version} need to investigate`;
  }
};

const generateOutputFinalText = async (output) => {
  if (output.version === 1) return await forVersion1(output);

  return await forVersionGreaterThan1(output);
};

const generateOutputText = async (feature) => {
  const [type, id] = feature.split("/");
  const url = `https://api.openstreetmap.org/api/0.6/${type}/${+id}.json`;

  try {
    const request = await fetch(url);

    if (request.status === 410) {
      return `${type}/${id}, is deleted`;
    }

    const response = await request.json();
    const output = response.elements[0];
    return await generateOutputFinalText(output);
  } catch (err) {
    if (err.statusCode === 504) {
      return `${type}/${id}, server timed-out`;
    }
  }
};

const checkInputTypes = async (features) => {
  let relationsCount = 0;
  let nodesCount = 0;
  let waysCount = 0;
  features.forEach((feature) => {
    if (feature.search("relation") !== -1) relationsCount++;
    if (feature.search("node") !== -1) nodesCount++;
    if (feature.search("way") !== -1) waysCount++;
  });

  return [relationsCount, nodesCount, waysCount];
};

const generateOutput = async (features) => {
  console.clear();
  if (features.length <= 0) {
    console.log(
      `Please enter a valid input!!!!!!!!
      A valid Input should look something like this:`
    );
    console.log(
      "\x1b[3m%s\x1b[0m",
      "https://www.openstreetmap.org/node/12345678"
    );
    return;
  }

  const [relations, nodes, ways] = await checkInputTypes(features);

  console.log(
    `Your are requesting ${relations} relation(s), ${nodes} node(s), ${ways} way(s)`
  );

  if (relations >= 25 || nodes >= 25) {
    return console.log(
      `Relations & Nodes should be lessthan 25 for optimizaion.`
    );
  }

  console.time("Time taken");
  console.log("\x1b[32m%s\x1b[0m", `Started processing data...`);

  return Promise.all(
    features.map(async (feature) => await generateOutputText(feature))
  )
    .then((responses) => {
      const responsesText = responses.map((item, i) => `${item}.`);
      responsesText.forEach((text) => {
        console.log(text);
        return;
      });
      return responses;
    })
    .finally(() => {
      console.log(
        "\x1b[32m%s\x1b[0m",
        `Finished fetching ${features.length} items.`
      );
      console.timeEnd("Time taken");
    });
};

module.exports = generateOutput;
