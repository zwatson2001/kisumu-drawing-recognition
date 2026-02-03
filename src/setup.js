async function setupGame() {
  const jsPsych = initJsPsych({
        default_iti: 1000,
        show_progress_bar: true
    });    

  // capture info from Prolific
  const assignmentID = jsPsych.data.getURLVariable('assignment_id');
  const responseID = parseInt(jsPsych.data.getURLVariable('response_id'));
  const beSampleID = 98041;
  const completionCode = responseID * beSampleID; 

  jsPsych.data.addProperties({
    participant_id: assignmentID,
    response_id: responseID
  });
  
  const main_on_finish = function(data) {
    console.log('emitting trial data', data)
  }

  const additionalInfo = {
    assignmentID: assignmentID, 
    responseID: responseID,
    on_finish: main_on_finish
  }  

  const choices = ["1", "2", "3", "4", "5"];
  const buttonText = ["1 (very bad)", "2 (bad)", "3 (neither good nor bad)", "4 (good)", "5 (very good)"]

  AWS.config.region = 'us-west-1';
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: 'us-west-1:6c98f036-704d-43ee-8919-a87026a2ad3a'});
  const dynamoDB = new AWS.DynamoDB.DocumentClient();

  async function getAssigned(participantNumber) {
    const params = {
      TableName: 'stimulus-assignments', 
      Key: {participantNumber: participantNumber}
    }

    try {
      const data = await dynamoDB.get(params).promise(); 
      return data.Item.assigned;
    } catch (error) {
      console.log(error);
    }
  }

  async function updateAssigned(participantNumber) {
    const params = {
      TableName: 'stimulus-assignments', 
      Key: {participantNumber: participantNumber}, 
      UpdateExpression: `set #a = :x`, 
      ExpressionAttributeNames: {
        "#a": "assigned"
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

  async function resetCount(drawingId) {
    const params = {
      TableName: 'kisumu-drawing-counts', 
      Key: {drawingId: drawingId}, 
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

  /*
  stimuli.forEach(async (stim) => {
    resetCount(stim.file.split(".")[0]); 
  })
  */

  // change this if running with new drawings
  const ageGroupIds = [[1, 20], [21, 40], [41, 60], [61, 80], [81, 100], [101, 120]];

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
    let stimSelected = false; 
    let optionsCopy = options;

    while (optionsCopy.length > 0) {
      const selectedStim = optionsCopy[Math.floor(Math.random() * optionsCopy.length)]; 

      optionsCopy = optionsCopy.filter((stim) => {
        stim.file !== selectedStim.file
      })

      const stimId = selectedStim.file.split(".")[0];
      const stimCount = await getCount(stimId); 
      
      if (stimCount < 10) {
        randomSubset.push(selectedStim); 
        stimSelected = true;
        updateProgressBar();
        break; 
      }
    }

    if (!assigned) {
      runNumber = i;
      break
    }
  }

  if (runNumber == undefined) {
    runNumber = Math.floor(Math.random() * 2) + 1;
  }

  console.log(randomSubset);

  randomSubset = _.shuffle(randomSubset);
  
  // Create raw trials list
  let rawTrials = [];
  function createTrialsList(callback) {      
    subset.forEach((stim) => {
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
          tracing_type: 2,
        },
        on_load: doOnLoad,
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
    'str1' : "<p id = 'tightinstruction'> We are interested in your ability to recognize a drawing --- specifically, how accurately you can match a drawing to its label.</p> <p> In total, you will be asked to rate 72 sketches.</p>",
    'str2' : '<p id = "exampleprompt"> On each trial you will be shown an drawing and 12 category labels (e.g. "CAT"). Your job will be to select the category that matches the drawing.',
    'str3' : "<p> Please adjust your screen (by zooming in/out) such that the drawings and labels are not blocked in any way.</p> <p>In total, this study should take around 15 minutes. Once you are finished, the study will be automatically submitted for approval. If you encounter a problem or error, please send us an email <a href='mailto://langcoglab@stanford.edu'>(langcoglab@stanford.edu)</a> and we will make sure you're compensated for your time. Thank you again for contributing to our research! Let's begin! </p>",
    'str4' : `<p> By answering the following questions, you are participating in a study being performed by
                  cognitive scientists in the Stanford Department of Psychology. If you have questions about this
                  research, please contact Michael C. Frank at mcfrank@stanford.edu. If you are not satisfied
                  with how this study is being conducted, or if you have any concerns, complaints, or general
                  questions about the research or your rights as a participant, please contact the Stanford
                  Institutional Review Board (IRB) to speak to someone independent of the research team at
                  irbnonmed@stanford.edu. Your participation in this research is voluntary. You may decline to
                  answer any or all of the following questions. You may decline further participation, at any time,
                  without adverse consequences. Your confidentiality is assured; the researchers who have
                  requested your participation will not receive any personal information about you. 
              </p>`,
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

  const filename = `${responseID || Math.floor(Math.random() * 10000000000)}_TEST.csv`;
  
  const save_data = {
    type: jsPsychPipe,
    action: "save",
    experiment_id: "c6Ea6z7ZniUx",
    filename: filename,
    data_string: () => jsPsych.data.get().csv(), 
    on_finish: async () => {
      for (let i = 0; i < randomSubset.length; i++) {
        const stim = randomSubset[i];
        const stimId = stim.file.split(".")[0];
        const stimCount = await getCount(stimId); 

        await updateCount(stimCount, stimId);

        console.log(`Updated count for image ${i}: ${stimId}`);
      }
    }
  };

  // Create goodbye trial (this doesn't close the browser yet)
  const goodbye = {
    type: jsPsychInstructions,
    pages: [
      `Thanks for participating in our experiment! You are all done now. Please enter this completion code into BeSample to complete the study and recieve credit: ${completionCode}.`
            ],
    show_clickable_nav: true,
    allow_backward: false,
    button_label_next: 'Submit',  
    on_finish: () => { 
      console.log(jsPsych.data);
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


