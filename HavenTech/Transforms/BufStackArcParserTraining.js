//# sourceURL=Transforms/BufStackArcParserTraining.js


// Trains or fills your model matrix by comparing state scores using a learning rate
// THE WEIGHT MATRIX UPDATE SYSTEM
function trainStep(posCombinationIndex, goldActionID, wordS0, wordB0, learningRate) {
  // Generate word semantic arrays inline
  computeSemanticHashInline(wordS0, vecS0);
  computeSemanticHashInline(wordB0, vecB0);
  
  // 1. Predict current best action using dot product evaluation
  let bestActionID = 0;
  let highestScore = -999999.0;
  
  let actionIdx = 0;
  while (actionIdx < NUM_ACTIONS) {
    let score = 0.0;
    let dimIdx = 0;
    
    // Offset inside the massive flat multiModalWeights block
    let baseOffset = (posCombinationIndex * TOKEN_VEC_DIM * NUM_ACTIONS) + (actionIdx * TOKEN_VEC_DIM);
    
    while (dimIdx < TOKEN_VEC_DIM) {
      // Evaluate combined feature score weight matrices
      score = score + (vecS0[dimIdx] + vecB0[dimIdx]) * multiModalWeights[baseOffset + dimIdx];
      dimIdx = dimIdx + 1;
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestActionID = actionIdx;
    }
    actionIdx = actionIdx + 1;
  }
  
  // 2. Adjust weights inline if prediction is incorrect
  if (bestActionID !== goldActionID) {
    let dimIdx = 0;
    let correctOffset = (posCombinationIndex * TOKEN_VEC_DIM * NUM_ACTIONS) + (goldActionID * TOKEN_VEC_DIM);
    let wrongOffset   = (posCombinationIndex * TOKEN_VEC_DIM * NUM_ACTIONS) + (bestActionID * TOKEN_VEC_DIM);
    
    while (dimIdx < TOKEN_VEC_DIM) {
      let featureValue = vecS0[dimIdx] + vecB0[dimIdx];
      // Reward the features of the correct structural action choice
      multiModalWeights[correctOffset + dimIdx] += learningRate * featureValue;
      // Penalize the features of the incorrect choice
      multiModalWeights[wrongOffset + dimIdx]   -= learningRate * featureValue;
      dimIdx = dimIdx + 1;
    }
    return 0; //Signifies an error occured (misclassification)
  }
  return 1; //Signifies a perfect prediction
}



// THE WEIGHT MATRIX UPDATE SYSTEM
function trainStep(posCombinationIndex, goldActionID, wordS0, wordB0, learningRate) {
  computeSemanticHashInline(wordS0, vecS0);
  computeSemanticHashInline(wordB0, vecB0);
  
  let bestActionID = 0;
  let highestScore = -999999.0;
  
  let actionIdx = 0;
  while (actionIdx < NUM_ACTIONS) {
    let score = 0.0;
    let dimIdx = 0;
    let baseOffset = (posCombinationIndex * TOKEN_VEC_DIM * NUM_ACTIONS) + (actionIdx * TOKEN_VEC_DIM);
    
    while (dimIdx < TOKEN_VEC_DIM) {
      score = score + (vecS0[dimIdx] + vecB0[dimIdx]) * multiModalWeights[baseOffset + dimIdx];
      dimIdx = dimIdx + 1;
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestActionID = actionIdx;
    }
    actionIdx = actionIdx + 1;
  }
  
  // Perceptron learning adjustment rule if the parser chooses poorly
  if (bestActionID !== goldActionID) {
    let dimIdx = 0;
    let correctOffset = (posCombinationIndex * TOKEN_VEC_DIM * NUM_ACTIONS) + (goldActionID * TOKEN_VEC_DIM);
    let wrongOffset   = (posCombinationIndex * TOKEN_VEC_DIM * NUM_ACTIONS) + (bestActionID * TOKEN_VEC_DIM);
    
    while (dimIdx < TOKEN_VEC_DIM) {
      let featureValue = vecS0[dimIdx] + vecB0[dimIdx];
      multiModalWeights[correctOffset + dimIdx] += learningRate * featureValue;
      multiModalWeights[wrongOffset + dimIdx]   -= learningRate * featureValue;
      dimIdx = dimIdx + 1;
    }
    return 0; // Signifies an error occurred (misclassification)
  }
  return 1; // Signifies a perfect prediction
}

// AUTOMATED DATA LOOPER UTILITY
function runAutomatedTraining(dataset, epochs, baseLearningRate) {
  console.log(`Starting context-fused training loop: ${epochs} epochs...`);
  
  let epoch = 0;
  while (epoch < epochs) {
    let totalSteps = 0;
    let correctSteps = 0;
    
    // Decay learning rate over time to stabilize final network weights
    let learningRate = baseLearningRate / (1.0 + (epoch * 0.1));
    
    let itemIdx = 0;
    while (itemIdx < dataset.length) {
      let sentenceData = dataset[itemIdx];
      let tokens = sentenceData.tokens;
      let posTags = sentenceData.posTags;
      let recipe = sentenceData.goldRecipe;
      
      let stepIdx = 0;
      while (stepIdx < recipe.length) {
        let step = recipe[stepIdx];
        
        let s0_word = (step.s0_idx === -1) ? "" : tokens[step.s0_idx];
        let b0_word = (step.b0_idx === -1) ? "" : tokens[step.b0_idx];
        
        let s0_pos = (step.s0_idx === -1) ? 0 : posTags[step.s0_idx];
        let b0_pos = (step.b0_idx === -1) ? 0 : posTags[step.b0_idx];
        
        // CONTEXT FUSION: Mix POS codes with the operational state flag
        // Uses a bitwise shift to keep active vs passive contexts completely isolated
        let stateFeatureIndex = (s0_pos * 6) + b0_pos;
        if (step.isPassiveContext === 1) {
          stateFeatureIndex += 36; // Shift to completely separate memory rows if passive
        }
        
        let result = trainStep(stateFeatureIndex, step.actionID, s0_word, b0_word, learningRate);
        
        correctSteps = correctSteps + result;
        totalSteps = totalSteps + 1;
        stepIdx = stepIdx + 1;
      }
      itemIdx = itemIdx + 1;
    }
    
    let accuracy = (correctSteps / totalSteps) * 100;
    console.log(`Epoch ${epoch + 1}/${epochs} -> Dynamic Training Accuracy: ${accuracy.toFixed(2)}%`);
    
    if (accuracy === 100.0) {
      console.log(`Perfect 100% Convergence reached at Epoch ${epoch + 1}!`);
      break;
    }
    epoch = epoch + 1;
  }
  return multiModalWeights;
}










// --- ACTION ID MATRIX OFFSETS ---
// Formula for Left-Arc:  1  + UD_CONSTANT
// Formula for Right-Arc: 38 + UD_CONSTANT
const ACT_SHIFT     = 0;
const ACT_L_NSUBJ   = 1  + 28; // 29
const ACT_R_OBJ     = 38 + 30; // 68
const ACT_L_DET     = 1  + 17; // 18
const ACT_R_DET     = 38 + 17; // 55
const ACT_L_AMOD    = 1  + 4;  // 5
const ACT_R_ADVMOD  = 38 + 3;  // 41
const ACT_L_AUX     = 1  + 6;  // 7
const ACT_R_OBL     = 38 + 31; // 69
const ACT_R_COP    = 38 + 14; // Right-Arc Copula relation (UD_COP = 14 -> 38 + 14 = 52)
const ACT_R_NSUBJ  = 38 + 28; // Right-Arc Nominal Subject variant (38 + 28 = 66)
const ACT_R_NMOD   = 38 + 27; // Right-Arc Noun Modifier (UD_NMOD = 27 -> 38 + 27 = 65)
const ACT_R_CASE   = 38 + 8;  // Right-Arc Case Marking (UD_CASE = 8 -> 38 + 8 = 46)
const ACT_L_ADVMOD = 1  + 3;  // Left-Arc Adverbial Modifier (UD_ADVMOD = 3 -> 1 + 3 = 4)





// Automated utility to build your raw data objects using a Wink-NLP instance
function prepareTrainingItem(text, goldRecipe, winkNlpInstance) {
  const doc = winkNlpInstance.readDoc(text);
  const tokens = doc.tokens().out(winkNlpInstance.its.value);
  const posStrings = doc.tokens().out(winkNlpInstance.its.pos);
  
  let posTags = new Int32Array(tokens.length);
  let i = 0;
  while (i < tokens.length) {
    posTags[i] = convertWinkPosToNumeric(posStrings[i], tokens[i]);
    i = i + 1;
  }
  
  return {
    tokens: tokens,
    posTags: posTags,
    goldRecipe: goldRecipe
  };
}


/*
// --- DEFINE RECIPES TRACKING PASSIVE ENVIRONMENT FLAGS ---
// Action 0 = Shift, Action 29 = Left-Arc(nsubj), Action 68 = Right-Arc(obj)
const activeRecipe = [
  { s0_idx: -1, b0_idx: 0, isPassiveContext: 0, actionID: 0 },  // Shift "Cats"
  { s0_idx: 0,  b0_idx: 1, isPassiveContext: 0, actionID: 29 }, // Left-Arc Subject
  { s0_idx: -1, b0_idx: 1, isPassiveContext: 0, actionID: 0 },  // Shift "chase"
  { s0_idx: 1,  b0_idx: 2, isPassiveContext: 0, actionID: 68 }  // Right-Arc Object
];

const passiveRecipe = [
  { s0_idx: -1, b0_idx: 0, isPassiveContext: 0, actionID: 0 },  // Shift "Mice"
  { s0_idx: 0,  b0_idx: 1, isPassiveContext: 0, actionID: 0 },  // Shift "are" (Live runtime flips flag AFTER this step)
  { s0_idx: 1,  b0_idx: 2, isPassiveContext: 1, actionID: 0 },  // Shift "chased"
  { s0_idx: 2,  b0_idx: 3, isPassiveContext: 1, actionID: 0 },  // Shift "by"
  { s0_idx: 3,  b0_idx: 4, isPassiveContext: 1, actionID: 29 }  // Left-Arc structural subject
];

// Initialize and execute the automated setup
const wink = window.WinkNLP.nlp;
const trainingDataset = [
  prepareTrainingItem("Cats chase mice", activeRecipe, wink),
  prepareTrainingItem("Mice are chased by cats", passiveRecipe, wink)
];

// Execute with an optimal baseline learning rate
// RUN THE EXECUTION METHOD ON SEED INGESTION
const finalTrainedMatrix = runAutomatedTraining(trainingDataset, 40, 0.2);





// Synthesizes a perfect gold transition step array from simple structural parts
function generateSyntheticGoldRecipe(subjectWord, verbWord, objectWord, isPassiveVoice) {
  let recipe = [];
  
  if (!isPassiveVoice) {
    // Layout sequence: [Subject, Verb, Object] -> e.g., "The player holds an item"
    // (Assuming simple 3-word core patterns for rapid perceptron weight generation)
    recipe.push({ s0_idx: -1, b0_idx: 0, isPassiveContext: 0, actionID: 0 });  // Shift Subject
    recipe.push({ s0_idx: 0,  b0_idx: 1, isPassiveContext: 0, actionID: 29 }); // Left-Arc Subject (UD_NSUBJ = 28 -> 1 + 28)
    recipe.push({ s0_idx: -1, b0_idx: 1, isPassiveContext: 0, actionID: 0 });  // Shift Verb
    recipe.push({ s0_idx: 1,  b0_idx: 2, isPassiveContext: 0, actionID: 68 }); // Right-Arc Object (UD_OBJ = 30 -> 38 + 30)
  } else {
    // Layout sequence: [Object, Auxiliary, Verb, Preposition, Subject] -> "The chest was opened by the player"
    recipe.push({ s0_idx: -1, b0_idx: 0, isPassiveContext: 0, actionID: 0 });  // Shift Object
    recipe.push({ s0_idx: 0,  b0_idx: 1, isPassiveContext: 0, actionID: 0 });  // Shift Aux ("was") -> Runtime flips passive bit
    recipe.push({ s0_idx: 1,  b0_idx: 2, isPassiveContext: 1, actionID: 0 });  // Shift Verb ("opened")
    recipe.push({ s0_idx: 2,  b0_idx: 3, isPassiveContext: 1, actionID: 0 });  // Shift Prep ("by")
    recipe.push({ s0_idx: 3,  b0_idx: 4, isPassiveContext: 1, actionID: 29 }); // Left-Arc true Subject back to Verb
  }
  
  return recipe;
}


// Upgraded synthetic recipe generator that adapts dynamically to sentence length
export function generateFlexibleGoldRecipe(tokens, posTags) {
  let recipe = [];
  // For a generic browser setup, we can use a small rules map 
  // to generate the training recipes automatically:
  let i = 0;
  let stack = [];
  let buffer = [];
  
  // Fill initial buffer trackers
  while(i < tokens.length) { buffer.push(i); i++; }
  
  // Rule-based oracle simulation loop to compile training recipes
  while (buffer.length > 0) {
    let s0 = stack.length > 0 ? stack[stack.length - 1] : -1;
    let b0 = buffer[0];
    
    let s0_pos = s0 === -1 ? 0 : posTags[s0];
    let b0_pos = posTags[b0];
    
    if (s0 === -1) {
      recipe.push({ s0_idx: s0, b0_idx: b0, actionID: 0 }); // Must SHIFT if stack empty
      stack.push(buffer.shift());
    } 
    else if (s0_pos === POS_DET && b0_pos === POS_NOUN) {
      // "the" -> "user" attachment link (UD_DET = 17 -> 1 + 17 = 18)
      recipe.push({ s0_idx: s0, b0_idx: b0, actionID: 18 }); 
      stack.pop(); // Left arc removes S0 from stack
    }
    else if (s0_pos === POS_NOUN && b0_pos === POS_VERB) {
      // Nominal Subject attachment link (UD_NSUBJ = 28 -> 1 + 28 = 29)
      recipe.push({ s0_idx: s0, b0_idx: b0, actionID: 29 });
      stack.pop();
    }
    else if (s0_pos === POS_VERB && b0_pos === POS_NOUN) {
      // Direct Object attachment link (UD_OBJ = 30 -> 38 + 30 = 68)
      recipe.push({ s0_idx: s0, b0_idx: b0, actionID: 68 });
      stack.push(buffer.shift());
    }
    else {
      // Fallback transition step rule
      recipe.push({ s0_idx: s0, b0_idx: b0, actionID: 0 }); // SHIFT
      stack.push(buffer.shift());
    }
  }
  return recipe;
}


// Quick Macro Loop to quickly generate 20+ varied training variants
function buildLargeSyntheticDataset(winkInstance) {
  let dataPool = [];
  let nouns = ["player", "monster", "wizard", "hero", "goblin", "knight", "witch", "dragon"];
  let verbs = ["strikes", "defeats", "summons", "heals", "finds", "attacks", "blocks", "takes"];
  
  let i = 0;
  while (i < nouns.length - 1) {
    let s = nouns[i];
    let v = verbs[i];
    let o = nouns[i + 1];
    
    // 1. Ingest Active Variant
    let activeText = `${s} ${v} ${o}`;
    let activeRecipe = generateSyntheticGoldRecipe(s, v, o, false);
    dataPool.push(prepareTrainingItem(activeText, activeRecipe, winkInstance));
    
    // 2. Ingest Passive Variant 
    let passiveText = `${o} was ${v} by ${s}`;
    let passiveRecipe = generateSyntheticGoldRecipe(o, v, s, true);
    dataPool.push(prepareTrainingItem(passiveText, passiveRecipe, winkInstance));
    
    i = i + 1;
  }
  return dataPool;
}

*/








function generateFlexibleGoldRecipe(tokens, posTags) {
  let recipe = [];
  let stack = [];
  let buffer = [];
  
  let i = 0;
  while (i < tokens.length) { 
    buffer.push(i); 
    i = i + 1; 
  }
  
  let isPassiveContext = 0;

  while (buffer.length > 0) {
    let s0 = stack.length > 0 ? stack[stack.length - 1] : -1;
    let b0 = buffer[0];
    
    let s0_pos = s0 === -1 ? POS_UNKNOWN : posTags[s0];
    let b0_pos = posTags[b0];
    
    // Dynamic runtime context tracking for passive markers
	if (s0 !== -1 && posTags[s0] === POS_AUX) {
		isPassiveContext = hasPassiveContextInline(buffer.length, tokens);
	}
	

    if (s0 === -1) {
      recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_SHIFT });
      stack.push(buffer.shift());
    } 
    // Rule 1: S0 is Determiner ("the"), B0 is Noun ("user") -> Left-Arc Det
    else if (s0_pos === POS_DET && b0_pos === POS_NOUN) {
      recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_L_DET });
      stack.pop();
    }
    // Rule 2: S0 is Adjective/Adverb, B0 is Noun/Verb -> Left-Arc Modifier
    else if (s0_pos === POS_ADV_ADJ && (b0_pos === POS_NOUN || b0_pos === POS_VERB)) {
      recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_L_AMOD });
      stack.pop();
    }
    // Rule 3: S0 is Noun, B0 is Verb -> Left-Arc Nominal Subject (Active Voice)
    else if (s0_pos === POS_NOUN && b0_pos === POS_VERB && isPassiveContext === 0) {
      recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_L_NSUBJ });
      stack.pop();
    }
    // Rule 4: S0 is Aux ("did"), B0 is Verb ("like") -> Left-Arc Auxiliary
    else if (s0_pos === POS_AUX && b0_pos === POS_VERB) {
      recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_L_AUX });
      stack.pop();
    }
    // Rule 5: S0 is Verb, B0 is Noun -> Right-Arc Direct Object
    else if (s0_pos === POS_VERB && b0_pos === POS_NOUN) {
      recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_R_OBJ });
      stack.push(buffer.shift());
    }
    // Rule 6: S0 is Verb, B0 is Preposition ("by") -> Right-Arc Oblique
    else if (s0_pos === POS_VERB && b0_pos === POS_ADP) {
      recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_R_OBL });
      stack.push(buffer.shift());
    }
    // Rule 7: Passive Voice Special Resolution -> Connecting agent noun back to verb
    else if (s0_pos === POS_ADP && b0_pos === POS_NOUN && isPassiveContext === 1) {
      recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_L_NSUBJ });
      stack.pop();
    }
    
    
    // Add these rules inside your generateFlexibleGoldRecipe while-loop:

	// Rule A: S0 is Noun ("user"), B0 is Aux/Copula ("is") -> Shift to wait for the root predicate noun
	else if (s0_pos === POS_NOUN && b0_pos === POS_AUX && isPassiveContext === 0) {
	  recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_SHIFT });
	  stack.push(buffer.shift());
	}
	// Rule B: S0 is Aux/Copula ("is"), B0 is Noun ("cat") -> Right-Arc Copula link (attaches "is" to "cat")
	else if (s0_pos === POS_AUX && b0_pos === POS_NOUN) {
	  recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_R_COP });
	  stack.push(buffer.shift());
	}
	// Rule C: S0 is Noun ("user"), B0 is Noun ("cat") -> Right-Arc Subject (attaches "user" as subject of "cat")
	else if (s0_pos === POS_NOUN && b0_pos === POS_NOUN) {
	  recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_R_NSUBJ });
	  stack.push(buffer.shift());
	}

    
    // Rule A: S0 is Adverb/Adjective ("where"), B0 is Auxiliary Verb ("are") -> Left-Arc Adverbial Modifier
	else if (s0_pos === POS_ADV_ADJ && b0_pos === POS_AUX) {
	  recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_L_ADVMOD });
	  stack.pop();
	}
	// Rule B: S0 is Noun ("legs"), B0 is Preposition ("of") -> Right-Arc to bind the preposition context
	else if (s0_pos === POS_NOUN && b0_pos === POS_ADP) {
	  recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_R_NMOD });
	  stack.push(buffer.shift());
	}
	// Rule C: S0 is Preposition ("of"), B0 is Noun ("cat") -> Right-Arc Case
	else if (s0_pos === POS_ADP && b0_pos === POS_NOUN) {
	  recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_R_CASE });
	  stack.push(buffer.shift());
	}

    
    
    // Default Fallback: Shift elements smoothly onto the stack
    else {
      recipe.push({ s0_idx: s0, b0_idx: b0, isPassiveContext: isPassiveContext, actionID: ACT_SHIFT });
      stack.push(buffer.shift());
    }
  }
  return recipe;
}




function buildLargeSyntheticDataset(winkInstance) {
  let dataPool = [];
  
  let subjects   = ["user", "player", "monster", "wizard", "hero", "cat", "dog", "goblin"];
  let verbs      = ["like", "strike", "defeat", "summon", "chase", "find", "attack", "take"];
  let objects    = ["cat", "mouse", "chest", "sword", "potion", "gold", "shield", "door"];
  let modifiers  = ["brave", "swift", "dark", "magic", "wild", "heavy", "old", "hidden"];
  let auxiliaries = ["did", "can", "will", "could", "must", "should", "would", "might"];

  let i = 0;
  while (i < subjects.length) {
    let s = subjects[i];
    let v = verbs[i];
    let o = objects[i];
    let m = modifiers[i];
    let a = auxiliaries[i];

    // --- STRUCTURAL VARIANT 1: Base Core (3 words) ---
    // e.g., "player strikes monster"
    let txt1 = `${s} ${v} ${o}`;
    let rc1 = generateFlexibleGoldRecipe(txt1.split(" "), [1, 2, 1]); // Raw type hints for fast ingest
    dataPool.push(prepareTrainingItem(txt1, rc1, winkInstance));

    // --- STRUCTURAL VARIANT 2: Modern Determiner Layout (5 words) ---
    // e.g., "the user did like a cat"
    let txt2 = `the ${s} ${a} ${v} a ${o}`;
    let item2 = prepareTrainingItem(txt2, null, winkInstance); // Build raw tokens via Wink-NLP first
    item2.goldRecipe = generateFlexibleGoldRecipe(item2.tokens, item2.posTags);
    dataPool.push(item2);

    // --- STRUCTURAL VARIANT 3: Modified Expressions (6 words) ---
    // e.g., "the brave hero defeats a dark monster"
    let txt3 = `the ${m} ${s} ${v} a ${o}`;
    let item3 = prepareTrainingItem(txt3, null, winkInstance);
    item3.goldRecipe = generateFlexibleGoldRecipe(item3.tokens, item3.posTags);
    dataPool.push(item3);

    // --- STRUCTURAL VARIANT 4: Full Passive Transformations (5 words) ---
    // e.g., "mouse was chased by cat"
    let txt4 = `${o} was ${v} by ${s}`;
    let item4 = prepareTrainingItem(txt4, null, winkInstance);
    item4.goldRecipe = generateFlexibleGoldRecipe(item4.tokens, item4.posTags);
    dataPool.push(item4);
    
    // --- STRUCTURAL VARIANT 5: Copula Identity Sentences (5 words) ---
	// e.g., "the player is a monster"
	let txt5 = `the ${s} is a ${o}`;
	let item5 = prepareTrainingItem(txt5, null, winkInstance);
	item5.goldRecipe = generateFlexibleGoldRecipe(item5.tokens, item5.posTags);
	dataPool.push(item5);


    i = i + 1;
  }
  
  console.log(`Generated ${dataPool.length} comprehensive synthetic training variants.`);
  return dataPool;
}

let trainSet = buildLargeSyntheticDataset(window.WinkNLP.nlp);
let finalTrainedMatrix = runAutomatedTraining(trainSet, 40, 0.2);






function downloadWeightsFile(weightsArray) {
  // Convert our Float32 representation to a raw downloadable browser binary chunk
  const blob = new Blob([weightsArray.buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'textPOSpchToGraphWeights.bin'; // Weighs exactly 76,800 bytes!
  link.click();
}

// Call this to generate your client asset file
downloadWeightsFile(finalTrainedMatrix);


async function loadWeightsIntoGameMemory(engineWeightsTablePointer) {
  const response = await fetch('/TextPOSpchToGraph/textPOSpchToGraphWeights.bin');
  const buffer = await response.arrayBuffer();
  
  // Copy raw binary asset directly into your pre-allocated array memory layer
  let loadedWeightsView = new Float32Array(buffer);
  engineWeightsTablePointer.set(loadedWeightsView);
  console.log("Semantic Parser Weights loaded into system memory context.");
}





//test case

// Run pipeline
let bufStackArcSPOResult = extractSPO("Cats chase mice", window.WinkNLP.nlp);
console.log("Knowledge Graph Triple:", bufStackArcSPOResult);
// Output will structure cleanly into: { subject: "Cats", predicate: "chase", object: "mice" }