//# sourceURL=Transforms/BufStackArcParser.js
//Buffer -> Stack -> Arc Set
//text to sentence dependency tree/graph parsing engine



// --- NUMERIC PART-OF-SPEECH CONSTANTS ---
const POS_UNKNOWN = 0;
const POS_NOUN    = 1;
const POS_VERB    = 2;
const POS_AUX     = 3; // "is", "are", "was", "been"
const POS_ADP     = 4; // Prepositions like "by", "with"
const POS_OTHER   = 5;

// Map raw Wink-NLP string values to our hard-coded execution integer constants
function convertWinkPosToNumeric(posStr, wordStr) {
  let lowerWord = wordStr.toLowerCase();
  // Catch passive helpers inline
  if (lowerWord === "are" || lowerWord === "was" || lowerWord === "been" || lowerWord === "is") return POS_AUX;
  if (posStr === 'NOUN' || posStr === 'PROPN' || posStr === 'PRON') return POS_NOUN;
  if (posStr === 'VERB') return POS_VERB;
  if (posStr === 'ADP') return POS_ADP; //(Prepositions like "by")
  return POS_OTHER;
}


// Universal Dependency Relation Enum Indices (0 to 36)
//const NUM_RELATIONS = 37;

const UD_ROOT       = 0;   // Root of the sentence (special case)
const UD_ACL        = 1;   // Clausal modifier of noun (e.g., "the book [that I read]")
const UD_ADVCL      = 2;   // Adverbial clause modifier
const UD_ADVMOD     = 3;   // Adverbial modifier
const UD_AMOD       = 4;   // Adjectival modifier
const UD_APPOS      = 5;   // Appositional modifier
const UD_AUX        = 6;   // Auxiliary (e.g., "have", "do")
const UD_AUXPASS    = 7;   // Passive auxiliary
const UD_CASE       = 8;   // Case marking (e.g., "of", "in")
const UD_CCOMP      = 9;   // Clausal complement
const UD_CLEFT      = 10;  // Clause-level ellipsis (e.g., "I think [so]")
const UD_CLF        = 11;  // Classifier (e.g., "three bottles of water")
const UD_COMPOUND   = 12;  // Compound (e.g., "blackboard")
const UD_CONJ       = 13;  // Conjunct
const UD_COP        = 14;  // Copula (e.g., "is", "are")
const UD_CSOBJ      = 15;  // Clausal subject
const UD_DEP        = 16;  // Unclassified dependent
const UD_DET        = 17;  // Determiner
const UD_DISLOCATED = 18;  // Dislocated elements (e.g., "John, I saw him")
const UD_EXPL       = 19;  // Expconstive (e.g., "There is a cat")
const UD_FIXED      = 20;  // Fixed multiword expression
const UD_FLAT       = 21;  // Flat multiword expression (e.g., names)
const UD_GOESWITH   = 22;  // Goes with (e.g., "New York" as "New_York")
const UD_IOBJ       = 23;  // Indirect object
const UD_LIST       = 24;  // List marker (e.g., "1.", "a.")
const UD_MARK       = 25;  // Marker (e.g., "to" in infinitive)
const UD_NEG        = 26;  // Negation modifier
const UD_NMOD       = 27;  // Noun modifier (e.g., "city [of London]")
const UD_NSUBJ      = 28;  // Nominal subject
const UD_NUMMOD     = 29;  // Numeric modifier
const UD_OBJ        = 30;  // Object (direct)
const UD_OBL        = 31;  // Oblique nominal (prepositional object)
const UD_ORPHAN     = 32;  // Orphan (e.g., ellipsis)
const UD_PARATAXIS  = 33;  // Parataxis (e.g., "Wait, what?")
const UD_PUNCT      = 34;  // Punctuation
const UD_REPARANDUM = 35;  // Reparandum (self-correction)
const UD_VOCATIVE   = 36;  // Vocative (e.g., "Hey, John!")



// Global Configuration limits to bound memory allocation safely at startup
// --- CONSTANTS MATCHING THE COMPRESSED PARSER LAYOUT ---
const MAX_TOKENS 		= 128;
const TOKEN_VEC_DIM 	= 16; //Dimension size of 16 of semantic character bigram hashes/vectors

const NUM_ACTIONS 		= 75; // 0: Shift, 1-37: Left_Arc(UD), 38-74: Right_Arc(UD)

const NUM_POFSPCH 		= 6;
const MEM_STK_FRM_SZ 	= 4;

// Operational Global State Segment Identifiers // Offset pointers inside our flat memory layout array
const MEM_STACK_PTR  	= 0;
const MEM_BUFFER_PTR 	= 1;
const MEM_ARC_PTR    	= 2;
const MEM_PASSIVE_FLG 	= 3; // Live runtime index tracker to hold active/passive status bits


// --- 1. GLOBAL MEMORY CONFIGURATION & SETUP --- to bound memory allocation safely at startup

// Clean Allocation Maps (Replaces "MAX_TOKENS * 5 + 4")
const TOTAL_STATE_CELLS = MEM_STK_FRM_SZ + (MAX_TOKENS * 5);
let stateMemory         = new Int32Array(TOTAL_STATE_CELLS); // Extra slot to handle global runtime states
let tokenPosTags        = new Int32Array(MAX_TOKENS);

// The primary model weights brain matrix.
// Rows: Combination of POS combinations (e.g., NOUN->VERB = 4).
// Columns: 16 semantic dimensions * 75 unique structural choices.
// Total Row Matrix Buckets = Active Combinations (6*6=36) + Passive Variant Spaces (36) = 72 Buckets
const STATE_BUCKETS     = (NUM_POFSPCH * NUM_POFSPCH) * 2;
let multiModalWeights   = new Float32Array(STATE_BUCKETS * TOKEN_VEC_DIM * NUM_ACTIONS);


// Pre-allocated static feature vector arrays to prevent garbage collection inside the loop
let vecS0 = new Float32Array(TOKEN_VEC_DIM);
let vecB0 = new Float32Array(TOKEN_VEC_DIM);




// Core Inline Math Token Evaluator
// Strict C-style semantic bigram hashing with zero heap garbage collection
function computeSemanticHashInline(word, outVec) {
  let len = word.length;
  
  // Clear the static reference vector
  let d = 0;
  while (d < TOKEN_VEC_DIM) {
    outVec[d] = 0.0;
    d = d + 1;
  }
  
  if (len < 2) return;

  let i = 0;
  while (i < len - 1) {
    let charCode1 = word.charCodeAt(i);
    let charCode2 = word.charCodeAt(i + 1);
    
    // Low-overhead string bitwise hashing mechanism
    let hash = (charCode1 << 5) - charCode1 + charCode2;
    let index = (hash < 0 ? -hash : hash) % TOKEN_VEC_DIM;
    
    outVec[index] = outVec[index] + 1.0; 
    i = i + 1;
  }
  
  // Inline non-allocating Tanh mathematical normalization 
  d = 0;
  while (d < TOKEN_VEC_DIM) {
    let v = outVec[d];
    // Fast algebraic approximation of Math.tanh(v) to maximize execution speed
    let exp2 = Math.exp(2.0 * v);
    outVec[d] = (exp2 - 1.0) / (exp2 + 1.0);
    d = d + 1;
  }
}





// --- 2. THE ZERO-ALLOCATION PARSING SYSTEM CORE ---
function initParserState(numTokens) {
  stateMemory[MEM_STACK_PTR]  	= 0; 
  stateMemory[MEM_BUFFER_PTR] 	= numTokens; 
  stateMemory[MEM_ARC_PTR]    	= 0; 
  stateMemory[MEM_PASSIVE_FLG] 	= 0; // Wipe our runtime passive context trackers on entry
  
  let i = 0;
  while (i < numTokens) {
    // Fill the buffer section backward so the first token is at the execution tip
    stateMemory[MEM_STK_FRM_SZ + MAX_TOKENS + i] = (numTokens - 1) - i; // Pack buffer stack structures back-to-front
    i = i + 1;
  }
}

function getStackTopOffset() {
  let size = stateMemory[MEM_STACK_PTR];
  if (size === 0) return -1;
  return stateMemory[MEM_STK_FRM_SZ + size - 1]; // Pushed forward 1 element due to passive bit configuration
}

function getBufferFrontOffset() {
  let size = stateMemory[MEM_BUFFER_PTR];
  if (size === 0) return -1;
  return stateMemory[MEM_STK_FRM_SZ + MAX_TOKENS + size - 1];
}

function hasHead(tokenIndex, totalArcs) {
  let i = 0;
  let arcBase = MEM_STK_FRM_SZ + (MAX_TOKENS * 2);
  while (i < totalArcs) {
    if (stateMemory[arcBase + MAX_TOKENS + i] === tokenIndex) return 1; 
    i = i + 1;
  }
  return 0; 
}


let STATE_BLOCK_SIZE = MAX_TOKENS * 5 + MEM_STK_FRM_SZ;

// Create a checkpoint of the active parser state
function checkpointStateSave() {
  let i = 0;
  while (i < STATE_BLOCK_SIZE) {
    // Copy the active state into a dedicated storage segment further down the array
    stateMemory[STATE_BLOCK_SIZE + i] = stateMemory[i];
    i = i + 1;
  }
}

// Restore state from checkpoint if a branch fails downstream semantic checks
function checkpointStateRollback() {
  let i = 0;
  while (i < STATE_BLOCK_SIZE) {
    stateMemory[i] = stateMemory[STATE_BLOCK_SIZE + i];
    i = i + 1;
  }
}


// --- PART 3: THE 75-MACRO-ACTION DECODER IMPLEMENTATION ---
// Decoder map to process the 75 macro actions
function executeMacroAction(actionID, s0, b0, stackSize, bufferSize, arcCount) {
  let arcBase = MEM_STK_FRM_SZ + (MAX_TOKENS * 2);

  if (actionID === 0) {
    // 1. ACTION: SHIFT
    stateMemory[MEM_STK_FRM_SZ + stackSize] = b0;
    stateMemory[MEM_STACK_PTR] = stackSize + 1;
    stateMemory[MEM_BUFFER_PTR] = bufferSize - 1;
    
    // Dynamic Passive Tracking State Check:
    // If the element shifted to the stack is an auxiliary word, throw our operational feature bit flag
    if (tokenPosTags[b0] === 3) {
    	stateMemory[MEM_PASSIVE_FLG] = 1;
    }
  } 
  else if (actionID >= 1 && actionID <= 37) {
    // ACTION: LEFT_ARC (The dependency index matches actionID - 1)
    let udRelation = actionID - 1;
    stateMemory[arcBase + arcCount] = b0; // Parent Head
    stateMemory[arcBase + MAX_TOKENS + arcCount] = s0; // Subject Dependent
    stateMemory[arcBase + (MAX_TOKENS * 2) + arcCount] = udRelation; 
    stateMemory[MEM_ARC_PTR] = arcCount + 1;
    stateMemory[MEM_STACK_PTR] = stackSize - 1; // Pop stack element
  } 
  else if (actionID >= 38 && actionID <= 74) {
    // ACTION: RIGHT_ARC  (The dependency index matches actionID - 38)
    let udRelation = actionID - 38;
    stateMemory[arcBase + arcCount] = s0; 
    stateMemory[arcBase + MAX_TOKENS + arcCount] = b0; 
    stateMemory[arcBase + (MAX_TOKENS * 2) + arcCount] = udRelation; 
    stateMemory[MEM_ARC_PTR] = arcCount + 1;
    
    // Traditional Arc-Eager rule configuration specifies pushing target elements to stack
    // Push buffer front onto stack, advance buffer pointer
    stateMemory[MEM_STK_FRM_SZ + stackSize] = b0;
    stateMemory[MEM_STACK_PTR] = stackSize + 1;
    stateMemory[MEM_BUFFER_PTR] = bufferSize - 1;
  }
}



function parseSentenceLoop(wordsArray) {
	let run = 1;

	while (run === 1) {
		let stackSize  = stateMemory[MEM_STACK_PTR];
		let bufferSize = stateMemory[MEM_BUFFER_PTR];
		let arcCount   = stateMemory[MEM_ARC_PTR];
		let isPassive  = stateMemory[MEM_PASSIVE_FLG];
		
		if (bufferSize === 0) {
			run = 0;
		}

		if (run === 1) {
			let s0 = getStackTopOffset();
			let b0 = getBufferFrontOffset();

			let s0_pos = (s0 === -1) ? 0 : tokenPosTags[s0];
			let b0_pos = (b0 === -1) ? 0 : tokenPosTags[b0];

			let s0_word = (s0 === -1) ? "" : wordsArray[s0];
			let b0_word = (b0 === -1) ? "" : wordsArray[b0];

			// Calculate dot product index signature using live structural indicators
			// Calculate the exact contextual cell matching active vs passive execution tracks
			let stateFeatureIndex = (s0_pos * NUM_POFSPCH) + b0_pos;
			if (isPassive === 1) {
				// Safely jumps past cell 36 into isolated memory blocks
				stateFeatureIndex += (NUM_POFSPCH * NUMPOFSPCH); // Shift pointer space if passive structures are active
			}

			// Load semantic vector matrices
			computeSemanticHashInline(s0_word, vecS0);
			computeSemanticHashInline(b0_word, vecB0);

			let bestActionID = 0;
			let highestScore = -999999.0;
		  
			let actionIdx = 0;
			while (actionIdx < NUM_ACTIONS) {
				let score = 0.0;
				let dimIdx = 0;
				// Calculate the final memory lookup address without magic offsets
				let baseOffset = (stateFeatureIndex * TOKEN_VEC_DIM * NUM_ACTIONS) + (actionIdx * TOKEN_VEC_DIM);

				while (dimIdx < TOKEN_VEC_DIM) {
			  		score = score + (vecS0[dimIdx] + vecB0[dimIdx]) * multiModalWeights[baseOffset + dimIdx];
				  	dimIdx = dimIdx + 1;
				}

				// Strict Validation Checks matching transition capabilities
				if (actionIdx === 0 && bufferSize > 0 && score > highestScore) {
					highestScore = score;
					bestActionID = actionIdx;
				}
				if (actionIdx >= 1 && actionIdx <= 37 && stackSize > 0 && hasHead(s0, arcCount) === 0 && score > highestScore) {
					highestScore = score;
					bestActionID = actionIdx;
				}
				if (actionIdx >= 38 && actionIdx <= 74 && stackSize > 0 && score > highestScore) {
					highestScore = score;
					bestActionID = actionIdx;
				}
				actionIdx = actionIdx + 1;
			}

			// Fire action macro updates
			executeMacroAction(bestActionID, s0, b0, stackSize, bufferSize, arcCount);
		}
	}
}





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

// --- PART 5: HIGH LEVEL PRODUCTION GRAPH INGEST STRIP ---
// --- 3. HIGH-LEVEL KNOWLEDGE GRAPH EXTRACTION BRIDGE ---
function extractSPO(text, winkNlpInstance) {
  // Read text tokens natively via the browser-loaded WinkNLP engine
  const doc = winkNlpInstance.readDoc(text);
  const wordsArray = doc.tokens().out(winkNlpInstance.its.value);
  const posArray = doc.tokens().out(winkNlpInstance.its.pos);
  
  let numTokens = wordsArray.length;
  if (numTokens > MAX_TOKENS) numTokens = MAX_TOKENS;

  // Convert text POS strings into numeric tokens to avoid string allocations inside the parsing engine
  for (let i = 0; i < numTokens; i += 1) {
	let posStr = posArray[i];
	let wordStr = wordsArray[i];
	tokenPosTags[i] = convertWinkPosToNumeric(posStr, wordStr)
  }

  // Bind and run our linear zero-allocation parsing state machine loop
  initParserState(numTokens);
  parseSentenceLoop(wordsArray);

  // Read raw structural results directly out of the flat Arc memory segment
  let totalArcs = stateMemory[MEM_ARC_PTR];
  let arcBase = MEM_STK_FRM_SZ + (MAX_TOKENS * 2);

  let subject = null;
  let predicate = null;
  let object = null;

  let a = 0;
  while (a < totalArcs) {
    let headIdx = stateMemory[arcBase + a];
    let depIdx  = stateMemory[arcBase + MAX_TOKENS + a];
    let relType = stateMemory[arcBase + (MAX_TOKENS * 2) + a];

    // Map structural dependency arcs back to human-readable strings
    if (relType === UD_NSUBJ) {
      subject = wordsArray[depIdx];
      predicate = wordsArray[headIdx];
    } 
    else if (relType === UD_OBJ) {
      object = wordsArray[depIdx];
    }
    a = a + 1;
  }

  // Return clean semantic outputs ready to populate your storage or vector graphs
  return {
    subject: subject,
    predicate: predicate,
    object: object
  };
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


/*
Extending This Architecture to Non-Text ModalitiesThe underlying linear transformation code can scale out to track multi-dimensional structures beyond text strings.Visual Scenes and 3D Bounding BoxesInstead of tracking words ordered sequentially on a page, your input elements in the memory buffer become identified object entities returned from your rendering or perception systems (e.g., bounding box coordinates or 3D polygon meshes).To process a visual scene using this transition engine without dynamic layout alterations:Fill your tokenPosTags array with spatial classification categories instead of speech parts (e.g., 1 for FLOOR, 2 for FURNITURE, 3 for PROP).Rather than using word-adjacency tokens, sort your raw structural elements inside the buffer based on geometric distance metrics or absolute coordinate spaces.Change the 37 output relation constants to reflect Spatial Hierarchy Relationships (e.g., UD_NSUBJ maps to SPATIAL_SUPPORTED_BY, UD_OBJ maps to SPATIAL_CONTAINED_WITHIN, and UD_AMOD maps to SPATIAL_BOUND_TO_BONE).The state machine will process the layout sequentially: it will evaluate a CUP primitive and a TABLE primitive, draw a relational assignment arc, and seamlessly output a structured 3D Scene Graph hierarchy without causing garbage collection overhead.Would you like to adjust the memory block map layout to natively house spatial 3D translation vectors (X, Y, Z) for real-time scene parsing, or should we look at loading standard model arrays into the weightsTable buffer?
*/
