async function setupGame() {
  const jsPsych = initJsPsych({
        default_iti: 1000,
        show_progress_bar: true
    });

  const completionCodeManual = "NO_COMPLETION_CODE";
  
  // run with stimulus set defined in URL
  const stimulusSet = jsPsych.data.getURLVariable('stimulus_set');

  // capture info from Prolific
  const prolificID = jsPsych.data.getURLVariable('PROLIFIC_PID');
  const studyID = jsPsych.data.getURLVariable('STUDY_ID');
  const sessionID = jsPsych.data.getURLVariable('SESSION_ID');
  const completionCode = jsPsych.data.getURLVariable('CC') || completionCodeManual;

  jsPsych.data.addProperties({
    study_id: studyID, 
    session_id: sessionID, 
    participant_id: prolificID
  });
  
  const main_on_finish = function(data) {
    console.log('emitting trial data', data)
  }

  const additionalInfo = {
    on_finish: main_on_finish
  }  

  const choices = ['Cow', 'Fish', 'Goat', 'Key', 'Mango', 'Person', 'Phone', 'Dog', 'Zebra', 'Face', 'Chicken', 'Banana', 'Sandal', 'Hand'];
  const prompt = "<p id = promptid>Which category does this drawing belong to?</p>";

  const responseButtonHtml = () =>
    _.map(choices, (choice) => `<button class="jspsych-btn" style="width:auto">${choice}</button>`);

  function equalizeResponseButtonWidths() {
    const buttons = document.querySelectorAll(
      '#jspsych-image-button-response-btngroup .jspsych-btn'
    );
    if (!buttons.length) return;

    buttons.forEach((btn) => {
      btn.style.width = 'auto';
    });

    let maxWidth = 0;
    buttons.forEach((btn) => {
      maxWidth = Math.max(maxWidth, btn.offsetWidth);
    });

    buttons.forEach((btn) => {
      btn.style.width = `${maxWidth}px`;
    });
  }

  const imageButtonResponseOnLoad = () => {
    const promptEl = document.getElementById('promptid');
    const btnGroup = document.getElementById('jspsych-image-button-response-btngroup');
    if (promptEl && btnGroup) {
      btnGroup.parentNode.insertBefore(promptEl, btnGroup);
    }
    equalizeResponseButtonWidths();
  };

  const BUCKET = 'kisumu-drawings-2026-891762599757-us-east-2-an';

  AWS.config.region = 'us-east-2';
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-2:3201a54a-dc5a-4ce8-9e48-f43a647e11e1',
  });
  
  const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

  async function initAws() {
    AWS.config.credentials.get((err) => {
      if (err) {
        console.error('Failed to get Cognito credentials', err);
        return;
      }
    });
  }

  await initAws();
  
  function getImageUrl(fileName) {
    return s3.getSignedUrl('getObject', {
      Bucket: BUCKET,
      Key: `drawings/${fileName}`,
      Expires: 900, // seconds
    });
  }
  
  let stimuli = stimulusSets[stimulusSet];
  if (!stimuli) {
    throw new Error(`Unknown stimulus set: ${stimulusSet}`);
  }
  stimuli = _.shuffle(stimuli.slice());
  
  // Create raw trials list
  let rawTrials = [];
  function createTrialsList(callback) {      
    stimuli.forEach((stim) => {
      const filename = stim + '.webp';
      const drawing_category = stim.split('_').pop();

      const trial = {
        type: jsPsychImageButtonResponse,
        prompt: prompt,
        choices: choices,
        button_html: responseButtonHtml,
        on_load: imageButtonResponseOnLoad,
        stimulus: () => getImageUrl(filename),
        post_trial_gap: 500,
        data: {
          drawing_category: drawing_category,
          drawing_id: filename.split('.')[0], 
          catch_trial: false, 
          prep_trial: false,
        },
        on_finish: (data) => {
          jsPsych.data.addDataToLastTrial({
            response: choices[data.response]
          });
        },
       };

      rawTrials.push(trial);
    });

    callback(rawTrials) // add catch trials
  }; 

  function createCatchTrials(callback) {
    // manually create a catch trial metadata object
    catch_paths = [{'drawing_category': 'Fish', 'path': 'stimuli/catch_trials/fish-catch.jpeg'}]
                  
    // make list of catch trials in same format as the other trials
    catchtrials = _.map(catch_paths, function(n,i) {
      return trial = {
        type: jsPsychImageButtonResponse,
        prompt: prompt,
        choices: choices,
        button_html: responseButtonHtml,
        on_load: imageButtonResponseOnLoad,
        stimulus: n.path,
        data: {
          catch_trial: true,
          prep_trial: false,
          drawing_category: "fish",
        },
        post_trial_gap: 500,
        on_finish: (data) => {
          jsPsych.data.addDataToLastTrial({
            response: choices[data.response]
          });
        },
      };
    });

    // add catch trials to trial list, randomly distributed
    catchtrials.forEach((trial) => {
      rawTrials.splice(Math.floor(Math.random() * rawTrials.length), 0, trial);
    });

    prep_paths = [
      { drawing_category: 'Banana', path: 'stimuli/prep_trials/banana-prep.jpg' },
      { drawing_category: 'Hand', path: 'stimuli/prep_trials/hand-prep.jpeg' },
    ];

    preptrials = _.map(prep_paths, function (n) {
      return trial = {
        type: jsPsychImageButtonResponse,
        prompt: prompt,
        choices: choices,
        button_html: responseButtonHtml,
        on_load: imageButtonResponseOnLoad,
        stimulus: n.path,
        data: {
          catch_trial: false,
          prep_trial: true,
          drawing_category: n.drawing_category,
        },
        post_trial_gap: 500,
        on_finish: (data) => {
          jsPsych.data.addDataToLastTrial({
            response: choices[data.response]
          });
        },
      };
    });

    for (let i = 0; i < preptrials.length; i++) {
      rawTrials.unshift(preptrials[i]);
    };
    
    // add trialNum to trial list with catch trials included now
    rawTrials = rawTrials.map((n,i) => {
      const o = Object.assign({}, n);
      o.trialNum = i
      return o
    });

    let trials = _.flatten(_.map(rawTrials, function(trialData, i) {
      const trial = _.extend({}, additionalInfo, trialData, {trialNum: i}); 
        return trial;
      })); 	

    callback(trials);
  };

  const preloadTrial = {
    type: jsPsychPreload,
    images: () => stimuli.map((stim) => getImageUrl(stim + '.webp')),
  };

  rawTrials.unshift(preloadTrial);

  // Define consent form language             
  // Define consent form language             
  consentHTML = {    
    'str1' : '<p> Hello! In this study, you will be asked to recognize and label various sketches! </p><p> We expect the average game to last about 15 minutes, including the time it takes to read these instructions. For your participation in this study, you will be paid $2.00.</p><i><p> Note: We recommend using Chrome. We have not tested this study in other browsers.</p></i>',
  }
  // Define instructions language
  instructionsHTML = {  
    'str1' : "<p id = 'tightinstruction'> We are interested in your ability to recognize a drawing --- specifically, how accurately you can match a drawing to its label.</p> <p> In total, you will be asked to rate 84 sketches.</p>",
    'str2' : '<p id = "exampleprompt"> On each trial you will be shown a drawing and 14 category labels (e.g. "FISH"). Your job will be to select the category that matches the drawing.',
    'str3' : "<p> Please adjust your screen (by zooming in/out) such that the drawings and labels are not blocked in any way.</p> <p>Once you are finished, the study will be automatically submitted for approval. If you encounter a problem or error, please send us an email <a href='mailto://langcoglab@stanford.edu'>(langcoglab@stanford.edu)</a> and we will make sure you're compensated for your time. Thank you again for contributing to our research! Let's begin! </p>"
  }    

  // Create consent + instructions instructions trial
  const welcome = {
    type: jsPsychInstructions,
    pages: [
      consentHTML.str1,
      instructionsHTML.str1,
      instructionsHTML.str2,
      instructionsHTML.str3,
    ],
    force_wait: 2000, 
    show_clickable_nav: true,
    allow_keys: false,
    allow_backward: false
  };

  const testSuffix = prolificID ? "" : "_TEST";
  const filename = `${prolificID || Math.floor(Math.random() * 10000000000)}${testSuffix}.csv`;
  
  const save_data = {
    type: jsPsychPipe,
    action: "save",
    experiment_id: "BBGlZ7AF5Zrz",
    filename: filename,
    data_string: () => jsPsych.data.get().csv(),
  };

  // Create goodbye trial (this doesn't close the browser yet)
  const goodbye = {
    type: jsPsychInstructions,
    pages: [
      'Thanks for participating in our experiment! You are all done now. Please click the button to be redirected to the prolific app (this will record your completion of the study).'
            ],
    show_clickable_nav: true,
    allow_backward: false,
    button_label_next: 'Submit',    
    on_finish: async () => {
      window.location = `https://app.prolific.com/submissions/complete?cc=${completionCode}`;
    }
  }

  function addBookends(trials) {
    // // add welcome trial to start of survey
    trials.unshift(welcome);
    
    // save data
    trials.push(save_data);
    // append goodbye trial
    trials.push(goodbye);

    jsPsych.run(trials);
  }


  // create trials list and add instrutions and exit survey
  createTrialsList(function (rawTrials) {
    createCatchTrials(function (trials) {
      addBookends(trials);
    })
  })
}
