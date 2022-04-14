// const fetch = (...args) =>
//   import("node-fetch").then(({ default: fetch }) => fetch(...args));

// const inputData = require("./inputData");
// const filter = require("./filter");

// exports.getFeatureVersion = async (url) => {
//   const { feature, id } = url;
//   try {
//     const request = await fetch(
//       `https://api.openstreetmap.org/api/0.6/${feature}/${+id}/full.json`
//     );
//   } catch (e) {}
// };

// function checkVersion(id) {
//   fetch(`https://api.openstreetmap.org/api/0.6/node/${id}.json`)
//     .then((response) => response.json())
//     .then((data) => console.log(data));
// }
// module.exports = checkVersion;

/* Output:
1. Feature existance (Yes/No)

2. Check for version
    If version == 1  --> if(node) => Manual review
                 --> if(way) => Manual review
                 --> if(relation) => Check for status

    else  If version > 1 --> if(node) => check for distance movement, else (all cases) => Manual review
               --> if(way) => Manual review
               --> if(relation) => check status

3. Final Output:
    Feature is relation/23788723, version is 3, Status is Good
*/
