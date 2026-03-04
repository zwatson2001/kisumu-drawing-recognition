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

  AWS.config.region = 'us-west-1';
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: 'us-west-1:6c98f036-704d-43ee-8919-a87026a2ad3a'});
  const dynamoDB = new AWS.DynamoDB.DocumentClient();

  async function getCount(drawingId) {
    const params = {
      TableName: 'kisumu-drawing-counts', 
      Key: {drawingId: drawingId}
    }

    try {
      const data = await dynamoDB.get(params).promise(); 
      return data.Item.count;
    } catch (error) {
      console.log(error);
    }
  }

  async function updateCount(currValue, drawingId) {
    const params = {
      TableName: 'kisumu-drawing-counts', 
      Key: {drawingId: drawingId}, 
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

  const priorityList = [
   "12-011.png",
   "116-008.png",
   "33-008.png",
   "35-013.png",
   "114-014.png",
   "20-009.png",
   "23-008.png",
   "36-013.png",
   "4-009.png",
   "41-008.png",
   "53-008.png",
   "67-006.png",
   "81-016.png",
   "83-008.png",
   "87-011.png",
   "95-006.png",
   "98-010.png",
   "108-010.png",
   "118-012.png",
   "119-016.png",
   "20-016.png",
   "40-015.png",
   "5-010.png",
   "57-013.png",
   "6-008.png",
   "61-014.png",
   "62-007.png",
   "65-008.png",
   "66-016.png",
   "75-014.png",
   "89-015.png",
   "92-007.png",
   "95-008.png",
   "97-014.png",
   "1-013.png",
   "10-009.png",
   "103-007.png",
   "105-013.png",
   "109-014.png",
   "119-009.png",
   "120-010.png",
   "16-010.png",
   "16-011.png",
   "18-005.png",
   "24-016.png",
   "25-006.png",
   "26-009.png",
   "28-013.png",
   "29-008.png",
   "3-006.png",
   "31-011.png",
   "34-011.png",
   "39-007.png",
   "4-011.png",
   "4-013.png",
   "40-013.png",
   "44-011.png",
   "48-005.png",
   "52-005.png",
   "53-010.png",
   "53-011.png",
   "54-011.png",
   "55-005.png",
   "58-011.png",
   "6-013.png",
   "61-012.png",
   "62-016.png",
   "69-007.png",
   "7-010.png",
   "71-015.png",
   "72-013.png",
   "75-016.png",
   "78-009.png",
   "8-008.png",
   "83-014.png",
   "85-009.png",
   "87-010.png",
   "88-016.png",
   "90-006.png",
   "92-013.png",
   "95-009.png",
   "98-012.png",
   "101-011.png",
   "101-014.png",
   "102-014.png",
   "103-010.png",
   "104-010.png",
   "108-013.png",
   "108-016.png",
   "109-013.png",
   "11-008.png",
   "11-016.png",
   "110-015.png",
   "111-010.png",
   "111-012.png",
   "112-010.png",
   "113-008.png",
   "114-005.png",
   "114-009.png",
   "115-007.png",
   "116-006.png",
   "116-010.png",
   "118-006.png",
   "118-009.png",
   "118-015.png",
   "119-006.png",
   "120-008.png",
   "13-009.png",
   "14-015.png",
   "18-007.png",
   "18-010.png",
   "18-014.png",
   "2-008.png",
   "2-010.png",
   "20-005.png",
   "21-005.png",
   "24-005.png",
   "24-006.png",
   "25-013.png",
   "26-007.png",
   "27-007.png",
   "27-009.png",
   "31-006.png",
   "31-008.png",
   "33-012.png",
   "35-005.png",
   "36-011.png",
   "37-015.png",
   "38-009.png",
   "38-013.png",
   "39-011.png",
   "39-015.png",
   "4-012.png",
   "4-015.png",
   "40-006.png",
   "41-013.png",
   "41-016.png",
   "44-008.png",
   "47-005.png",
   "48-008.png",
   "49-010.png",
   "51-015.png",
   "53-014.png",
   "53-015.png",
   "54-007.png",
   "54-009.png",
   "56-013.png",
   "58-005.png",
   "58-013.png",
   "59-010.png",
   "59-011.png",
   "60-008.png",
   "60-009.png",
   "60-013.png",
   "61-007.png",
   "61-016.png",
   "63-015.png",
   "64-016.png",
   "65-009.png",
   "65-015.png",
   "66-006.png",
   "66-015.png",
   "67-007.png",
   "68-014.png",
   "68-015.png",
   "72-009.png",
   "73-007.png",
   "73-016.png",
   "75-007.png",
   "76-013.png",
   "77-010.png",
   "78-015.png",
   "79-007.png",
   "79-011.png",
   "80-008.png",
   "82-011.png",
   "84-012.png",
   "85-013.png",
   "86-012.png",
   "87-007.png",
   "88-007.png",
   "90-007.png",
   "90-010.png",
   "90-014.png",
   "92-014.png",
   "92-015.png",
   "94-008.png",
   "96-014.png",
   "98-009.png",
  ];
  
  // pick a stimulus that has not already been shown to 10 participants
  async function selectStimulus(options) {
    let stimSelected = false; 

    const optionsIds = options.map(item => item.file);
    const priorityOptions = priorityList.filter(item => optionsIds.includes(item));

    if (priorityOptions.length > 0) {
      const optionCounts = await Promise.all(
        priorityOptions.map(async (item) => {
          const count = await getCount(item.split(".")[0]);
          return count;
        })
      );

      const minCount = Math.min(...optionCounts);
      const minIndex = optionCounts.indexOf(minCount);
      const selectedStim = priorityOptions[minIndex];

      randomSubset.push(options.filter(item => selectedStim == item.file)[0]);
      stimSelected = true;
    }

    // pick a random stimulus if none of them meet the criteria
    if (!stimSelected) {
      randomSubset.push(options[Math.floor(Math.random() * options.length)]); 
    }
  }

  let randomSubset = [];
  // select random subset of stimuli - one from each category x age group combination
  for (let i = 0; i < choices.length; i++) {
    const category = choices[i];
    for (let j = 0; j < ageGroupIds.length; j++) {
      const range = ageGroupIds[j];
      const ageGroup = stimuli.filter((stim) => {
        return (
          (Number(stim.participant_id) >= range[0] && Number(stim.participant_id) <= range[1]) &&
          (stim.english === category)
        )
      });

      await selectStimulus(ageGroup);
    }
    updateProgressBar();
  }
  
  const progBar = document.getElementById("progress-bar"); 
  progBar.remove();

  console.log(randomSubset);

  randomSubset = _.shuffle(randomSubset);
  
  // Create raw trials list
  let rawTrials = [];
  function createTrialsList(callback) {      
    randomSubset.forEach((stim) => {
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
    'str1' : '<p> Hello! In this study, you will be asked to recognize and label various sketches! </p><p> We expect the average game to last about 15 minutes, including the time it takes to read these instructions. For your participation in this study, you will be paid $0.50.</p><i><p> Note: We recommend using Chrome. We have not tested this study in other browsers.</p></i>',
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

  const filename = `${assignmentID || Math.floor(Math.random() * 10000000000)}.csv`;
  
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


