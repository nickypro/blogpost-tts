// NOTE: remember to initiate GOOGLE_APPLICATION_CREDENTIALS
const MAX_CHARACTER_LIMIT = 4950;

const textToSpeech = require('@google-cloud/text-to-speech');
const audioconcat = require('audioconcat');
const mp3Duration = require('mp3-duration');
const fs = require('fs');
const util = require('util');

const defaultSpeakers = require('speakers.js')

// Creates a google cloud platform tts client
const client = new textToSpeech.TextToSpeechClient();

function padLeadingZeros(num, size) {
  var s = num+"";
  while (s.length < size) s = "0" + s;
  return s;
}

function dictateFile( filename ) {
  // Get file variables
  const path = filename.split("/")
  const file = path[ path.length-1 ]
  const workdir = "output/" + file + "/"
  if ( !fs.existsSync( workdir ) ) fs.mkdirSync( workdir, {recursive: true} );
  if ( !fs.existsSync( workdir+"part/" ) ) fs.mkdirSync( workdir+"part/" );

  // Load in the text being recorded
  console.log( "reading file: ", filename );
  const fulltext = fs.readFileSync(filename, 'utf8');
  console.log( "length of text loaded:", fulltext.length );

  const speakers = defaultSpeakers.speakers
  const speakerMap = defaultSpeakers.speakerMap
  const speakerReferenceCount = {}
  const speakerMostRecentReference = {}

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

  // Create consistent list objects to store data
  function newPart( speaker, text, index, isTitle=false ) {
    return ({
      text,
      speaker,
      voice: getVoice( speaker ),
      output: workdir + "part/" + file + padLeadingZeros( index, 4 ) + ".mp3",
      isTitle,
    })
  }

  // Convert the text into a list of data objects to be synthesized
  function splitText( text ) {
    currentSpeaker = "Narrator"
    output = []
    lines = text.split("\n")
    name = /\[(\w+)\].*/
    title = /^\d+\..*/

    for (line of lines){
      
      // recognise a title, read it out as the narator, take a note for bibliography
      if ( title.test( line ) ) {
        output.push( newPart("Narrator", line, output.length, isTitle=true) )
        continue
      }

      line = line.trim()

      // skip blank lines
      if (!line) continue;

      // read out the speaker's name the first few times they talk
      if ( name.test( line ) ) {
        currentSpeaker = name.exec(line)[1]
        if ( !(currentSpeaker in speakerReferenceCount) ) {
          speakerReferenceCount[currentSpeaker] = 0;  
        }
        if ( !(currentSpeaker in speakerMostRecentReference) {
          speakerMostRecentReference[currentSpeaker] = output.length + 1;
        }
        if (    speakerReferenceCount[currentSpeaker] < 5
             || speakerMostRecentReference[currentSpeaker] + 20 < output.length ) {
          speakerReferenceCount[ currentSpeaker ] += 1
          output.push(newPart( "Narrator", currentSpeaker, output.length ))
        }
        continue
      }
     
      // merge blocks of text to somewhat reduce requests if the speaker is the same ( maybe unnecessary )
      const prev = output[ output.length-1 ]
      if ( prev && prev["speaker"] == currentSpeaker
           && !prev["isTitle"] 
           && ( prev["text"].length + line.length ) < MAX_CHARACTER_LIMIT ) {

        if ( prev["text"][ prev["text"].length - 1 ] != "." ) {
          prev["text"] += "."
        }
        prev["text"] += " " + line 
        continue
      }

      // add to the outputs
      output.push( newPart( currentSpeaker, line, output.length ))
    }

    return output
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
      const outputFilename = item["output"]
      await request( item, outputFilename )
      outputFiles.push( outputFilename )
      i += 1
    }
    return outputFiles
  }

  // combine into one large mp3 file
  function combine( list ) {
    audioconcat(list)
     .concat(workdir + file + 'final' + '.mp3')
     .on('error', error => console.log('Failed to concatenate files', error))
     .on('end', () => console.log('Generating audio prompts'));
  }

  async function genTimestamps( inputs ) {
    const getDur = ( fileName ) => new Promise( res => mp3Duration( fileName, (err, dur) => { 
      if ( err ) console.error( err );
      res(dur) 
    }))
    currentTime = 0
    for ( item of inputs ) {
      t = await getDur( item["output"] )
      x = Math.floor( currentTime )
      if ( x < 3600 ){
        item["timestamp"] = Math.floor( x / 60 ) + ":" + padLeadingZeros( ( x % 60 ), 2 )
      } else {
        item["timestamp"] = Math.floor( x / 3600 ) + ":" + padLeadingZeros( Math.floor( x / 60 ) % 60, 2 ) 
                                                   + ":" + padLeadingZeros( ( x % 60 ), 2 )
      }
      item["duration"] = t
      currentTime += t
    }
  }

  function getTitleTimestamps( inputs ) {
    titles = ""
    for ( item of inputs ) {
      if ( !item["isTitle"] ) continue;
      titles += item["timestamp"] + " " + item["text"] + "\n"
    }
    return titles
  }

  // run the main processes
  async function run() {
    // create the mp3
    const inputs = splitText( fulltext )
    console.log( inputs )
    outputs = await synthesizeItems( inputs ) 
    combine( outputs )
    
    // timestamps and bibliography
    console.log( "Getting timestamps of all sentences." )
    await genTimestamps( inputs )
    console.log( "Outputting file data to json file." )
    fs.writeFileSync( workdir+file+".json", JSON.stringify( inputs, null, 4 ) );
    const timestamps = getTitleTimestamps( inputs )
    console.log( "Timestamps:" )
    console.log( timestamps )
    console.log( "Outputting timestams of main sections." )
    fs.writeFileSync( workdir+file+"-timestamps.txt", timestamps );
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
