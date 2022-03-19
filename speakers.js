
const speakers = new Set([
    //"en-AU-Wavenet-A", Narrator
    "en-AU-Wavenet-B",
    "en-AU-Wavenet-C",
    "en-AU-Wavenet-D",
    "en-IN-Wavenet-A",
    "en-IN-Wavenet-B",
    "en-IN-Wavenet-C",
    "en-IN-Wavenet-D",
    "en-GB-Wavenet-A",
    //"en-GB-Wavenet-B", Richard Ngo
    "en-GB-Wavenet-C",
    "en-GB-Wavenet-D",
    "en-GB-Wavenet-F",
    //"en-US-Wavenet-A", Nate Soares
    //"en-US-Wavenet-B", Steve Omohundro 
    "en-US-Wavenet-C",
    "en-US-Wavenet-D",
    "en-US-Wavenet-E",
    //"en-US-Wavenet-F", Anonymous
    "en-US-Wavenet-G",
    "en-US-Wavenet-H",
    //"en-US-Wavenet-I", Eliezer Yudkowski
    //"en-US-Wavenet-J", Paul Christiano
  ])

const speakerMap = {
    "Narrator": "en-AU-Wavenet-A",
    "Ngo": "en-GB-Wavenet-B",
    "Yudkowsky": "en-US-Wavenet-I",
    "Eliezer Yudkowsky": "en-US-Wavenet-I",
    "Soares": "en-US-Wavenet-A",
    "Nate Soares": "en-US-Wavenet-A",
    "Anonymous": "en-US-Wavenet-F",
    "Steve Omohundro": "en-US-Wavenet-B"
  }

module.exports = { speakers, speakerMap }
