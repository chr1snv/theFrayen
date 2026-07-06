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
  // Perceptron learning adjustment rule if the parser chooses poorly
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




function generateFlexibleGoldRecipe(tokens, posTags) {
	// 1. Run the structural normalization preprocessor
	let finalLength = preProcessSentenceStructure(tokens, posTags, tokens.length, outputIndexMap, timeContextTracker);


	let recipe = [];
	let stack  = [];
	let buffer = [];

	// 2. Load the transformed index sequence into our workspace buffer
	for (let b = 0; b < finalLength; b++) {
		buffer.push(outputIndexMap[b]);
	}

	// Because the stream is normalized, it compiles as a clean active sequence
	while (buffer.length > 0) {
		let s0 = stack.length > 0 ? stack[stack.length - 1] : -1;
		let b0 = buffer[0];

		let s0_pos = s0 === -1 ? POS_UNKNOWN : posTags[s0];
		let b0_pos = posTags[b0];
    
	
		//LEFT_ARC mutations must pop the stack (stack.pop()) because the modifier token is consumed and assigned to a head forward in the buffer
		//RIGHT_ARC mutations must push the buffer element onto the stack (stack.push(buffer.shift())). The verb attaches to the incoming noun, but that noun remains active because it might have modifiers coming up later
		//REDUCE actions must pop the stack (stack.pop()) without shifting
	
//////Group 1: Core Setup & Modifiers//////
	
		//Rule 1: Empty Stack Boundary
		if (s0 === -1) {
		  recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_SHIFT });
		  stack.push(buffer.shift());
		} //Why: You cannot draw arcs with nothing on the stack. Push the first buffer token.

		// Rule 2: S0 is Determiner ("the"), B0 is Noun ("user") -> Left-Arc Det
		else if (s0_pos === POS_DET && b0_pos === POS_NOUN) {
		  recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_L_DET });
		  stack.pop();
		} //Why: Attaches the article directly to the incoming noun, then pops the article off.

		// Rule 3: S0 is Adjective/Adverb, B0 is Noun/Verb -> Left-Arc Modifier
		else if (s0_pos === POS_ADV_ADJ && (b0_pos === POS_NOUN || b0_pos === POS_VERB)) {
		  recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_L_AMOD });
		  stack.pop();
		} //Why: Binds descriptive descriptors to their target concept immediately.


//////Group 2: Spatial & Prepositional Chains//////

		//Rule 4: Noun to Preposition (e.g., "legs" → "of")
		else if (s0_pos === POS_NOUN && b0_pos === POS_ADP) {
			recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_R_NMOD }); // ID 65
			stack.push(buffer.shift());
		} //Why: Tells the engine the noun has a spatial modifier coming up. It pushes "of" to the stack.


		//Rule 5: Preposition to Target Noun (e.g., "of" → "cat")
		else if (s0_pos === POS_ADP && b0_pos === POS_NOUN) {
		  recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_R_CASE }); // ID 46
		  stack.push(buffer.shift());
		} //Why: Links the preposition to its target object. It pushes the target noun to the stack.


//////Group 3: Verbs & Clause Transitions//////


		//Rule 6: Auxiliary Verbs (e.g., "did" → "like")
		else if (s0_pos === POS_AUX && b0_pos === POS_VERB) {
		  recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_L_AUX });
		  stack.pop();
		} //Why: Attaches the helper verb to the main action root.


		//Rule 7: Stack-Draining Evacuation (The "Attached" Trigger)
		else if (s0_pos === POS_NOUN && b0_pos === POS_AUX) {
		  // If S0 is an inner modifier noun ("cat") that already has a structural parent head,
		  // we issue a REDUCE step to pop it off the stack, exposing the true main subject ("legs") beneath it!
		  if (hasHead(s0, recipe.length) === 1) {
			recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_REDUCE });
			stack.pop();
		  } else {
			recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_SHIFT });
			stack.push(buffer.shift());
		  }
		} //Why: Crucial for complex clauses. It pops completed spatial modifiers (like "cat") off the stack to uncover the sentence's true primary subject ("legs")


//////Group 4: Subject/Object Binding//////

		//Rule 8: Active Voice Subject (e.g., "cats" → "chase")
		else if (s0_pos === POS_NOUN && b0_pos === POS_VERB ) {
		  recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_L_NSUBJ });
		  stack.pop();
		} //Why: Standard active voice subject hook.

		////Rule 9: Passive Voice Target (e.g., "legs" → "attached")
		//else if (s0_pos === POS_NOUN && b0_pos === POS_VERB && isPassiveContext === 1) {
		//	recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_L_NSUBJ });
		//	stack.pop();
		//} //Why: This uses the same NSUBJ relation code, but your feature hash maps it to separate memory cells so the perceptron doesn't overlap active and passive behaviors.

		//Rule 10: Direct Object (e.g., "chase" → "mice")
		else if (s0_pos === POS_VERB && b0_pos === POS_NOUN) {
			recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_R_OBJ });
			stack.push(buffer.shift()); // FIXED
		} //Why: Binds traditional direct objects to active verb roots.

		//Rule 11: Oblique Spatial Locations (e.g., "attached" → "rear")
		else if (s0_pos === POS_VERB && (b0_pos === POS_ADP || b0_pos === POS_NOUN) ) {
			recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_R_OBL });
			stack.push(buffer.shift()); // FIXED
		} //Why: Binds locational targets directly back to spatial verbs or actions.


		// Rule 12: Interrogative Copula Alignment (e.g., "are" [AUX] -> "we" [NOUN])
		else if (s0_pos === POS_AUX && b0_pos === POS_NOUN) {
		  // In questions, map the pronoun/noun as the active subject of the auxiliary predicate root
		  recipe.push({ s0_idx: s0, b0_idx: b0, actionID: (1 + 28) }); // LEFT_ARC_NSUBJ (29)
		  stack.pop();
		}



		// Default Fallback: Shift elements smoothly onto the stack
		else {
		  recipe.push({ s0_idx: s0, b0_idx: b0, actionID: ACT_SHIFT });
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
  
  // Add these text inputs to your synthetic dataset generation system
  let additionalCases = [
  	"where are we",          // Interrogative / Question structure
  	"who are you",           // Interrogative / Question structure
  	"the player is here",    // Copula state structure
  	"monsters are active"    // Copula state structure
  ];
  
  for( let i = 0; i < additionalCases.length; ++i ){
  	let txt = additionalCases[i];
    let item = prepareTrainingItem(txt, null, winkInstance); // Build raw tokens via Wink-NLP first
    item.goldRecipe = generateFlexibleGoldRecipe(item.tokens, item.posTags);
    dataPool.push(item);
  }



  for( let i = 0; i < subjects.length; ++i ) {
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


	// Question Template: "where are we", "where can players find gold"
	let questionText = `where are ${s}`;
	let qItem = prepareTrainingItem(questionText, null, winkInstance);
	qItem.goldRecipe = generateFlexibleGoldRecipe(qItem.tokens, qItem.posTags);
	dataPool.push(qItem);

	// Prepositional Chain Template: "the legs of the cat are attached to the rear"
	let prepText = `the legs of the ${s} are attached to the rear`;
	let pItem = prepareTrainingItem(prepText, null, winkInstance);
	pItem.goldRecipe = generateFlexibleGoldRecipe(pItem.tokens, pItem.posTags);
	dataPool.push(pItem);

  }
  
  console.log(`Generated ${dataPool.length} comprehensive synthetic training variants.`);
  return dataPool;
}

var generatedFiftySixVariants = buildLargeSyntheticDataset(window.WinkNLP.nlp);

/*
let finalTrainedMatrix = runAutomatedTraining(generatedFiftySixVariants, 40, 0.2);






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

*/



//test case

// Run pipeline
let bufStackArcSPOResult = extractSPO("Cats chase mice", window.WinkNLP.nlp);
console.log("Knowledge Graph Triple:", bufStackArcSPOResult);
// Output will structure cleanly into: { subject: "Cats", predicate: "chase", object: "mice" }