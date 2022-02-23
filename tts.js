// NOTE: remember to initiate GOOGLE_APPLICATION_CREDENTIALS

// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');
const audioconcat = require('audioconcat');

// Import other required libraries
const fs = require('fs');
const util = require('util');
// Creates a client
const client = new textToSpeech.TextToSpeechClient();


function dictateFile( filename ) {
  // Load in the text to synthesize
  console.log( "reading file: ", filename );
  const fulltext = fs.readFileSync(filename, 'utf8');
  console.log( "length of text loaded:", fulltext.length );

  speakers = new Set([
    "en-AU-Wavenet-A",
    "en-AU-Wavenet-B",
    "en-AU-Wavenet-C",
    //"en-AU-Wavenet-D", Narrator
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
    "en-US-Wavenet-B",
    "en-US-Wavenet-C",
    "en-US-Wavenet-D",
    "en-US-Wavenet-E",
    "en-US-Wavenet-F",
    "en-US-Wavenet-G",
    "en-US-Wavenet-H",
    //"en-US-Wavenet-I", Eliezer Yudkowski
    "en-US-Wavenet-J",
  ])

  speakerMap = {
    "Narrator": "en-AU-Wavenet-D",
    "Ngo": "en-GB-Wavenet-B",
    "Yudkowsky": "en-US-Wavenet-I",
    "Soares": "en-US-Wavenet-A",
  }

  speakerReferenceCount = {}

  function getVoice( speaker ) {
    if ( !(speaker in speakerMap) ){
      s = Array.from( speakers )
      const i = Math.floor( Math.random() * s.length );
      x = s[i]
      speakers.delete( x )
      speakerMap[speaker] = x
    }
    return speakerMap[speaker]
  } 

  function newPart( speaker, text ) {
    return ({
      speaker: speaker,
      text: text,
      voice: getVoice( speaker ),
    })
  }

  function splitText( text ) {
    currentSpeaker = "Narrator"
    output = []
    lines = text.split("\n")
    name = /\[(\w+)\].*/
    title = /\d+\..*/

    for (line of lines){
      line = line.trim()

      if (!line) continue;

      if ( name.test( line ) ) {
        currentSpeaker = name.exec(line)[1]
        if ( !(currentSpeaker in speakerReferenceCount) ) {
          speakerReferenceCount[currentSpeaker] = 0;  
        }
        if ( speakerReferenceCount[currentSpeaker] < 5 ) {
          speakerReferenceCount[ currentSpeaker ] += 1
          output.push(newPart( "Narrator", currentSpeaker ))
        }
        continue
      }
      
      if ( title.test( line ) ) {
        currentSpeaker = "Narrator"
      }
 
      const prev = output[ output.length-1 ]
      if ( prev && prev["speaker"] == currentSpeaker && ( prev["text"].length + line.length ) < 4950 ) {
        if ( prev["text"][ prev["text"].length - 1 ] != "." ) {
          prev["text"] += "."
        }
        prev["text"] += " " + line 
        continue
      }

      output.push( newPart( currentSpeaker, line ))
    }

    return output
  }

  function padLeadingZeros(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
  }

  async function request( item, outputFilename ) {
    const { voice, text } = item
    // Construct the request
    const request = {
      input: {text},
      // Select the language and SSML voice gender (optional)
      voice: {languageCode: 'en-US', name: voice},
      audioConfig: {audioEncoding: 'MP3'},
    };

    // Perform the text-to-speech request
    const [response] = await client.synthesizeSpeech(request)
    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile)
    await writeFile(outputFilename, response.audioContent, 'binary')
    console.log('Audio content written to file: ', outputFilename )

    return true
  }
  
  async function synthesizeItems( inputs ){
    outputFiles = []
    let i = 0;
    for ( item of inputs ) {
      const outputFilename = filename + padLeadingZeros(i, 4) + ".mp3"
      await request( item, outputFilename )
      outputFiles.push( outputFilename )
      i += 1
    }
    return outputFiles
  }

  // combine into one large mp3 file
  function combine( list ) {
    audioconcat(list)
     .concat(filename + '.mp3')
     .on('error', error => console.log('Failed to concatenate files', error))
     .on('end', () => console.log('Generating audio prompts'));
  }

  async function run() {
    const inputs = splitText( fulltext )
    console.log( inputs )
    outputs = await synthesizeItems( inputs ) 
    console.log( outputs )
    combine( outputs )
  }

  run()
}



// run main if it is a script run from CLI
function main() {
  // Take in input parameter: filename 
  if ( process.argv.length < 3 ) {
    console.log("please input the file name you would like to synthesize.")
    console.log("usage: node tts.js ./input.txt")
    return;
  }
  const filename = process.argv[ 2 ]

  // Run the script
  dictateFile( filename );
}

if (require.main === module) {
  main();
}
