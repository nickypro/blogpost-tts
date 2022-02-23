// NOTE: remember to initiate GOOGLE_APPLICATION_CREDENTIALS

// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');
const audioconcat = require('audioconcat');


// Import other required libraries
const fs = require('fs');
const util = require('util');
// Creates a client
const client = new textToSpeech.TextToSpeechClient();

async function dictateFile() {
  // Take in input parameter: filename 
  if ( process.argv < 3 ) {
    console.log("please input the file name you would like to synthesize.")
    console.log("usage: node tts.js ./input.txt")
    return;
  }
  // Load in the text to synthesize
  const filename = process.argv[2];
  console.log( "reading file: ", filename );
  const text = [ fs.readFileSync(filename, 'utf8') ];
  console.log( "length of text loaded:", text[0].length );

  // Google only accepts files of length less that 5000 characters to be synthesized, split up
  while ( text[ text.length - 1 ].length > 5000 ) {
    const curr = text[ text.length - 1 ];
    console.log("text too long")
    let index = 4999;
    while ( curr[ index ] != '\n' && curr[ index ] != '.' ) {
      index -= 1
    }
    text.push( curr.slice( index+1 ) );
    text[ text.length - 2 ] = curr.slice( 0, index+1 );
  }
  console.log( text );
  let list = []

  // iteratively convert the post into pieces of audio
  for ( let i = 0; i<text.length ; i++ ) {
    // Construct the request
    const request = {
      input: {text: text[i]},
      // Select the language and SSML voice gender (optional)
      voice: {languageCode: 'en-US', name:'en-US-Wavenet-I'},
      audioConfig: {audioEncoding: 'MP3'},
    };

    // Perform the text-to-speech request
    const [response] = await client.synthesizeSpeech(request)
    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile)
    const outputFilename = filename + i + ".mp3"
    await writeFile(outputFilename, response.audioContent, 'binary')
    console.log('Audio content written to file: ', outputFilename )
    list.push( outputFilename )
  }
  
  // combine into one large mp3 file
  audioconcat(list)
   .concat(filename + '.mp3')
   .on('error', error => Log.error('Failed to concatenate files', error))
   .on('end', () => Log.info('Generating audio prompts'));
}
dictateFile();
