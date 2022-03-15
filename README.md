# MIRI Conversations Reader, with Google Text-to-Speech
Simple script to convert a text article to text to speech. Simply copy an article into a text file and run the script to get an mp3. 
Note that you will need to create a google cloud platform project to do this, and get credentials for your account. You will also need a recent version of node installed.
To get started, in your terminal use the commands:

```
git clone https://github.com/pesvut/blogpost-tts
cd blogpost-tts
git checkout -b dialogue
npm install
mkdir input output creds
```

Note, now you will need to create a file with your google credentials.
See [googleapis/nodejs-text-to-speech](https://github.com/googleapis/nodejs-text-to-speech) to see how this is done.
Once you have exported your. keys to some file ( let us say `./creds/google.json` ) we will need to run:
```
export GOOGLE_APPLICATION_CREDENTIALS="./creds/google.json"
```

Now finally we can start converting out text files. Write your text file to ./input/some-text-file.txt, and we get the output:
```
node tts.js ./input/some-text-file.txt
```

This will create a merged output mp3 file.
