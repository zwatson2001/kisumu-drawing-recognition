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

  const choices = ["1", "2", "3", "4", "5"];
  const buttonText = ["1 (very bad)", "2 (bad)", "3 (neither good nor bad)", "4 (good)", "5 (very good)"]

  AWS.config.region = 'us-west-1';
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: 'us-west-1:6c98f036-704d-43ee-8919-a87026a2ad3a'});
  const dynamoDB = new AWS.DynamoDB.DocumentClient();

  async function getCount(tracingId) {
    const params = {
      TableName: 'kisumu-tracing-counts', 
      Key: {tracingId: tracingId}
    }

    try {
      const data = await dynamoDB.get(params).promise(); 
      return data.Item.count;
    } catch (error) {
      console.log(error);
    }
  }

  async function updateCount(currValue, tracingId) {
    const params = {
      TableName: 'kisumu-tracing-counts', 
      Key: {tracingId: tracingId}, 
      UpdateExpression: `set #a = :x`, 
      ExpressionAttributeNames: {
        "#a": "count"
      }, 
      ExpressionAttributeValues: {
        ":x": (currValue + 1)
      }
    } 

    try {
      data = await dynamoDB.update(params).promise();
      return data;
    } catch (error) {
      console.log(error);
    }
  }

  /*
  async function resetCount(tracingId) {
    const params = {
      TableName: 'kisumu-tracing-counts', 
      Key: {tracingId: tracingId}, 
      UpdateExpression: `set #a = :x`, 
      ExpressionAttributeNames: {
        "#a": "count"
      }, 
      ExpressionAttributeValues: {
        ":x": 0
      }
    } 

    try {
      data = await dynamoDB.update(params).promise();
      return data;
    } catch (error) {
      console.log(error);
    }
  }

  stimuli.forEach(async (stim) => {
    resetCount(stim.file_name.split(".")[0]); 
  })
  */

  function updateProgressBar(){
    const fill = document.getElementById("fill"); 
    const progBar = document.getElementById("progress-bar");

    const progBarWidth = progBar.offsetWidth;
    const fillWidth = fill.offsetWidth;
    const origWidth = fillWidth / progBarWidth * 100; 
    let newWidth = origWidth + 2;
    if (newWidth > 100) {
      newWidth = 100; 
    }
    fill.style.width = `${newWidth}%`;
  }
  
  // pick a stimulus that has not already been shown to 10 participants
  async function selectStimulus(options) {
    let stimSelected; 

    for (let i = 0; i < options.length; i++) {
      const stim = options[i];
      const stimId = stim.file_name.split(".")[0];
      const stimCount = await getCount(stimId); 
      
      if (stimCount < 10) {
        randomSubset.push(stim); 
        stimSelected = stimId;
        updateProgressBar();
        break; 
      }
    }

    // pick a random stimulus if none of them meet the criteria
    if (stimSelected == undefined) {
      const stim = options[Math.floor(Math.random() * options.length)];
      randomSubset.push(stim); 
      stimSelected = stim.file_name.split(".")[0];
    }

    return stimSelected;
  }

  function doOnLoad() {
    // equalize button sizes
    const buttons = document.querySelectorAll('button')
    const buttonSizes = [];
    buttons.forEach((button) => {
      buttonSizes.push(button.clientWidth);
      console.log(button.clientWidth);
    });
    
    const size = Math.max(...buttonSizes);
    buttons.forEach((button) => {
      button.style = `width:${size}px`; 
      console.log(`width:${size}px`)
    });
    
    const content = document.getElementById('jspsych-content');
    content.style.display = "flex"; 
    content.style.alignItems = "center";
    content.style.flexDirection = "column";
    const buttonContainer = document.getElementById('jspsych-image-button-response-btngroup'); 
    buttonContainer.style.display = "flex";
    buttonContainer.style.alignItems = "center";
  }

  let randomSubset = [];
  // select random subset of stimuli - two from each category x age group combination
  for (let i = 1; i <= 5; i++) {
    for (let j = 4; j <= 9; j++) {
      const ageGroup = stimuli.filter((stim) => {
        return (
          (+stim.participant_age == j)  &&
          (+stim.tracing_type === i)
        )
      });
      
      // select two stimuli per group - not the same one
      const firstStimId = await selectStimulus(ageGroup);

      const secondStimOptions = ageGroup.filter((stim) => {
        return (stim.file_name.split(".")[0] !== firstStimId)
      })

      await selectStimulus(secondStimOptions);
    }
    updateProgressBar();
  }
  randomSubset = _.shuffle(randomSubset);
  
  const progBar = document.getElementById("progress-bar"); 
  progBar.remove();
  
  // Create raw trials list
  let rawTrials = [];
  function createTrialsList(callback) {      
    randomSubset.forEach((stim) => {
      const trial = {
        type: jsPsychImageButtonResponse,
        prompt: "<p id = promptid>Please give this tracing a rating from 1 to 5.</p>",
        choices: choices,
        button_html: () => {
          return (_.map(buttonText, (choice) => {
            return `<button class="jspsych-btn" style="width:auto">${choice}</button>`
          }));
        },
        stimulus: `https://kisumu-drawings.s3-us-west-1.amazonaws.com/tracings/${stim.file_name}`,
        post_trial_gap: 500,
        data: {
          tracing_type: stim.tracing_type,
          tracing_id: stim.file_name, 
          catch_trial: false, 
          prep_trial: false,
        },
        on_load: doOnLoad,
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
    catch_paths = [{'tracing_type': '2', 'path': 'stimuli/catch_trials/catch_trial.png'}]
                  
    // make list of catch trials in same format as the other trials
    catchtrials = _.map(catch_paths, function(n,i) {
      return trial = {
        type: jsPsychImageButtonResponse,
        prompt: "<p id = promptid>Please give this tracing a rating from 1 to 5.</p>",
        choices: choices,
        button_html: () => {
          return (_.map(buttonText, (choice) => {
            return `<button class="jspsych-btn" style="width:auto">${choice}</button>`
          }));
        },
        stimulus: n.path,
        data: {
          catch_trial: true,
          prep_trial: false,
          sketcher_category: n.category,
        },
        on_load: doOnLoad,
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

    /*
    for (let i = 0; i < preptrials.length; i++) {
      rawTrials.unshift(preptrials[i]);
    };
    */
    
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
    'str1' : '<p> Hello! In this study, you will be asked to rate the quality of a series of 60 tracings! </p><p> We expect the average game to last about 10 minutes, including the time it takes to read these instructions. For your participation in this study, you will be paid $2.00.</p><i><p> Note: We recommend using Chrome. We have not tested this study in other browsers.</p></i>',
  }
  // Define instructions language
  instructionsHTML = {  
    'str1' : "<p id = 'exampleprompt'> On each trial you will be shown a blue tracing of a gray background object. Please give the tracing a rating from 1 (very bad) to 5 (very good) based on how much the blue lines overlap with the gray lines.</p>",
    'str2' : "<p> Here is an example of a high-quality tracing: </p><img src='stimuli/examples/example_good.png'; height='400px'></img>",
    'str3' : "<p> Here is an example of a low-quality tracing: </p><img src='stimuli/examples/example_bad.png'; height='400px'></img>",
    'str4' : "<p> Please adjust your screen (by zooming in/out) such that the tracings and rating buttons are not blocked in any way.</p> <p> Once you are finished, the study will be automatically submitted for approval. If you encounter a problem or error, please send us an email <a href='mailto://langcoglab@stanford.edu'>(langcoglab@stanford.edu)</a> and we will make sure you're compensated for your time. Thank you again for contributing to our research! Let's begin! </p>"
  }  

  // Create consent + instructions instructions trial
  const welcome = {
    type: jsPsychInstructions,
    pages: [
      consentHTML.str1,
      instructionsHTML.str1,
      instructionsHTML.str2,
      instructionsHTML.str3,
      instructionsHTML.str4,
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
    data_string: () => jsPsych.data.get().csv(), 
    on_load: async () => {
      for (let i = 0; i < randomSubset.length; i++) {
        const stimId = randomSubset[i].file_name.split(".")[0];
        const currValue = await getCount(stimId);
        await updateCount(currValue, stimId)
      }
    }
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
      window.location = "https://app.prolific.com/submissions/complete?cc=C18GSJ0Y"
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


