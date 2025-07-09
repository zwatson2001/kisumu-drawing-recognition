async function setupGame() {
  const jsPsych = initJsPsych({
        default_iti: 1000,
        show_progress_bar: true
    });    

  // capture info from Prolific
  const prolificID = jsPsych.data.getURLVariable('PROLIFIC_PID');
  const studyID = jsPsych.data.getURLVariable('STUDY_ID');
  const sessionID = jsPsych.data.getURLVariable('SESSION_ID');

  jsPsych.data.addProperties({
    study_id: studyID, 
    session_id: sessionID, 
    participant_id: prolificID
  });
  
  const main_on_finish = function(data) {
    console.log('emitting trial data', data)
  }

  const additionalInfo = {
    prolificID: prolificID,
    studyID: studyID,
    sessionID: sessionID,
    on_finish: main_on_finish
  }  

  const choices = [
    'Airplane', 
    'Bicycle', 
    'Bird', 
    'Car', 
    'Cat', 
    'Chair', 
    'Cup', 
    'Hat', 
    'House', 
    'Rabbit', 
    'Tree', 
    'Watch'
  ];
/*
  // code for regenerating participant assigments
  let currParticipant = 1;
  const finalList = [];
  let currList = [];
  participantsPerRun.forEach((stim) => {
    console.log(stim.participant);
    if (Number(stim.participant) > currParticipant) {
      finalList.push(_.shuffle(currList)); 
      currList = [];
      currParticipant += 1;
    }

    const entry = stimuli.filter((fullStim) => {
      return fullStim.file === stim.sketch_id
    })
    console.log(entry.length); 
    currList.push(entry[0])
  })
  finalList.push(_.shuffle(currList)); 

console.log(JSON.stringify(finalList));
*/

  // Create raw trials list
  let rawTrials = [];
  function createTrialsList(callback) {      
    secondRoundStimuli.forEach((stim) => {
      const trial = {
        type: jsPsychImageButtonResponse,
        prompt: "<p id = promptid>Which category does this drawing belong to?</p>",
        choices: choices,
        button_html: () => {
          return (_.map(choices, (choice) => {
            return `<button class="jspsych-btn">${choice}</button>`
          }));
        },
        stimulus: `https://kisumu-drawings.s3-us-west-1.amazonaws.com/${stim.file}`,
        post_trial_gap: 500,
        data: {
          sketcher_category: stim.english,
          sketch_id: stim.file, 
          catch_trial: false, 
          prep_trial: false,
        },
        on_finish: (data) => {
          jsPsych.data.addDataToLastTrial({
            response_category: choices[data.response]
          });
        },
       };

      rawTrials.push(trial);
    });

    callback(rawTrials) // add catch trials
  }; 

  function createCatchTrials(callback) {
    // manually create a catch trial metadata object
    catch_paths = [{'category': 'airplane', 'path': 'stimuli/catch_trials/0_airplane_catch.jpg'}]
                  
    // make list of catch trials in same format as the other trials
    catchtrials = _.map(catch_paths, function(n,i) {
      return trial = {
        type: jsPsychImageButtonResponse,
        prompt: "<p id = promptid>Which category does this drawing belong to?</p>",
        choices: choices,
        button_html: () => {
          return (_.map(choices, (choice) => {
            return `<button class="jspsych-btn">${choice}</button>`
          }));
        },
        stimulus: n.path,
        data: {
          catch_trial: true,
          prep_trial: false,
          sketcher_category: n.category,
        },
        post_trial_gap: 500,
        on_finish: (data) => {
          jsPsych.data.addDataToLastTrial({
            response_category: choices[data.response]
          });
        },
      };
    });

    prep_paths = [
      {'category': 'cat', 'path': 'stimuli/prep_trials/0_cat_prep.jpg'},
      {'category': 'car', 'path': 'stimuli/prep_trials/1_car_prep.png'},
    ];

    preptrials = _.map(prep_paths, function(n,i) {
      return trial = {
        type: jsPsychImageButtonResponse,
        prompt: "<p id = promptid>Which category does this drawing belong to?</p>",
        choices: choices,
        stimulus: n.path,
        button_html: () => {
          return (_.map(choices, (choice) => {
            return `<button class="jspsych-btn">${choice}</button>`
          }));
        },
        data: {
          catch_trial: false,
          prep_trial: true,
          sketcher_category: n.category,
        },
        post_trial_gap: 500,
        on_finish: (data) => {
          jsPsych.data.addDataToLastTrial({
            response_category: choices[data.response]
          });
        },
      };
    });

    // add catch trials to trial list, randomly distributed
    catchtrials.forEach((trial) => {
      rawTrials.splice(Math.floor(Math.random() * rawTrials.length), 0, trial);
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

  // Define consent form language             
  consentHTML = {    
    'str1' : '<p> Hello! In this study, you will be asked to recognize and label various sketches! </p><p> We expect the average game to last about 15 minutes, including the time it takes to read these instructions. For your participation in this study, you will be paid $2.00.</p><i><p> Note: We recommend using Chrome. We have not tested this study in other browsers.</p></i>',
  }
  // Define instructions language
  instructionsHTML = {  
    'str1' : "<p id = 'tightinstruction'> We are interested in your ability to recognize a drawing --- specifically, how accurately you can match a drawing to its label.</p> <p> In total, you will be asked to rate 72 sketches.</p>",
    'str2' : '<p id = "exampleprompt"> On each trial you will be shown a drawing and 12 category labels (e.g. "CAT"). Your job will be to select the category that matches the drawing.',
    'str3' : "<p> Please adjust your screen (by zooming in/out) such that the drawings and labels are not blocked in any way.</p> <p>In total, this study should take around 10 minutes. Once you are finished, the study will be automatically submitted for approval. If you encounter a problem or error, please send us an email <a href='mailto://langcoglab@stanford.edu'>(langcoglab@stanford.edu)</a> and we will make sure you're compensated for your time. Thank you again for contributing to our research! Let's begin! </p>"
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

  const filename = `${prolificID || Math.floor(Math.random() * 10000000000)}.csv`;
  
  const save_data = {
    type: jsPsychPipe,
    action: "save",
    experiment_id: "c6Ea6z7ZniUx",
    filename: filename,
    data_string: () => jsPsych.data.get().csv()
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
      window.location = "https://app.prolific.com/submissions/complete?cc=CI5H8RGF"
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


