//# sourceURL=Transforms/BufStackArcParser.js
//Buffer -> Stack -> Arc Set
//text to sentence dependency tree/graph parsing engine



// --- NUMERIC PART-OF-SPEECH CONSTANTS ---
const NUMPOFSPCH  = 8;
const POS_UNKNOWN = 0;
const POS_NOUN    = 1;
const POS_VERB    = 2;
const POS_AUX     = 3; // "is", "are", "was", "been"
const POS_ADP     = 4; // Prepositions like "by", "with"
const POS_DET     = 5; // Determiners like Track "the", "a", "an", "this"
const POS_ADV_ADJ = 6; // Modifiers like "quickly" (ADV) or "big" (ADJ)
const POS_OTHER   = 7; // Shifted up

function POStoSTR(pos){
	switch( pos ){
		case 0: return "UNKOWN";
		case 1: return "NOUN";
		case 2: return "VERB";
		case 3: return "AUX";
		case 4: return "ADP";
		case 5: return "DET";
		case 6: return "ADV_ADJ";
		case 7: return "OTHER";
	}
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


// --- ACTION ID MATRIX OFFSETS ---
// Formula for Left-Arc:  1  + UD_CONSTANT
// Formula for Right-Arc: 38 + UD_CONSTANT
const ACT_SHIFT     = 0;
const ACT_REDUCE    = 75;      // Action ID 75 is REDUCE
const ACT_L_NSUBJ   = 1  + 28; // 29
const ACT_R_OBJ     = 38 + 30; // 68
const ACT_L_DET     = 1  + 17; // 18
const ACT_R_DET     = 38 + 17; // 55
const ACT_L_AMOD    = 1  + 4;  // 5
const ACT_R_ADVMOD  = 38 + 3;  // 41
const ACT_L_AUX     = 1  + 6;  // 7
const ACT_R_OBL     = 38 + 31; // 69 (Right-Arc Oblique Location Element)
const ACT_R_COP     = 38 + 14; // 52 Right-Arc Copula relation (UD_COP = 14 -> 38 + 14 = 52)
const ACT_R_NSUBJ   = 38 + 28; // 66 Right-Arc Nominal Subject variant (38 + 28 = 66)
//the legs of the cat are attached to its rear
const ACT_R_NMOD    = 38 + 27; // 65 Right-Arc Noun Preposition Modifier (UD_NMOD = 27 -> 38 + 27 = 65)
const ACT_R_CASE    = 38 + 8;  // 46 Right-Arc Case Marker (UD_CASE = 8 -> 38 + 8 = 46)
const ACT_L_ADVMOD  = 1  + 3;  // 4 Left-Arc Adverbial Modifier (UD_ADVMOD = 3 -> 1 + 3 = 4)



// Global Configuration limits to bound memory allocation safely at startup
// --- CONSTANTS MATCHING THE COMPRESSED PARSER LAYOUT ---
const MAX_TOKENS 		= 128;
const TOKEN_VEC_DIM 	= 32; //Dimension size of 16 of semantic character bigram hashes/vectors

const NUM_ACTIONS 		= 76; // 0: Shift, 1-37: Left_Arc(UD), 38-74: Right_Arc(UD)

const NUM_POFSPCH 		= 6;


const MEM_STK_FRM_SZ 	= 3; //4;
// Operational Global State Segment Identifiers // Offset pointers inside our flat memory layout array
const MEM_STACK_PTR  	= 0;
const MEM_BUFFER_PTR 	= 1;
const MEM_ARC_PTR    	= 2;
//const MEM_PASSIVE_FLG 	= 3; // Live runtime index tracker to hold active/passive status bits


// --- 1. GLOBAL MEMORY CONFIGURATION & SETUP --- to bound memory allocation safely at startup

// Clean Allocation Maps (Replaces "MAX_TOKENS * 5 + 4")
const TOTAL_STATE_CELLS = MEM_STK_FRM_SZ + (MAX_TOKENS * 5);
let stateMemory         = new Int32Array(TOTAL_STATE_CELLS); // Extra slot to handle global runtime states
let tokenPosTags        = new Int32Array(MAX_TOKENS);

let outputIndexMap      = new Int32Array(MAX_TOKENS);
let timeContextTracker  = new Int32Array(2);

// The primary model weights brain matrix.
// Rows: Combination of POS combinations (e.g., NOUN->VERB = 4).
// Columns: 16 semantic dimensions * 75 unique structural choices.
// Total Row Matrix Buckets = Active Combinations (6*6=36) + Passive Variant Spaces (36) = 72 Buckets
const STATE_BUCKETS     = (NUM_POFSPCH * NUM_POFSPCH);// * 2; //*2 was before past tense pre processing
let multiModalWeights   = new Float32Array(STATE_BUCKETS * TOKEN_VEC_DIM * NUM_ACTIONS);


// Pre-allocated static feature vector arrays to prevent garbage collection inside the loop
let vecS0 = new Float32Array(TOKEN_VEC_DIM);
let vecB0 = new Float32Array(TOKEN_VEC_DIM);




// --- PRINTS GRAPH RELATIONSHIP ARCS AT SENTENCE TERMINATION ---
function printSentenceDependencyGraph(wordsArray) {
  let totalArcs = stateMemory[MEM_ARC_PTR];
  let arcBase   = MEM_STK_FRM_SZ + (MAX_TOKENS * 2);
  
  console.log(`\n=== Final Parsed Relationship Graph (${totalArcs} Arcs) ===`);
  
  let a = 0;
  while (a < totalArcs) {
    let headIdx = stateMemory[arcBase + a];
    let depIdx  = stateMemory[arcBase + MAX_TOKENS + a];
    let relType = stateMemory[arcBase + (MAX_TOKENS * 2) + a];
    
    // Translate structural relation integer flags back into human-readable Universal Dependency tags
    let relLabel = "dep";
    if (relType === 4)  relLabel = "amod";
    if (relType === 6)  relLabel = "aux";
    if (relType === 14) relLabel = "cop";
    if (relType === 17) relLabel = "det";
    if (relType === 28) relLabel = "nsubj";
    if (relType === 30) relLabel = "obj";
    if (relType === 31) relLabel = "obl";

    console.log(`Arc [${a}]:  "${wordsArray[headIdx]}" ──(${relLabel})──> "${wordsArray[depIdx]}"`);
    a = a + 1;
  }
  console.log("==================================================\n");
}




// Force core structural game actions to translate into true structural VERBs
const VERB_FALLBACK_SET = new Set(["chase", "chased", "strike", "strikes", "like", "likes", "defeat", "defeats", "summon", "summons", "find", "finds"]);
const MODAL_AUX_SET  = new Set(["can", "will", "could", "must", "should", "would", "might", "did", "does", "do"]);
const COPULA_AUX_SET = new Set(["is", "am", "are", "was", "were", "been", "be"]);
const DETERMINER_SET = new Set(["the", "a", "an", "this", "that"]);
// A fast lookup set for common passive past-participle overrides that don't end in "-ed"
// Global exception set for common irregular passive verbs
const PASSIVE_VERB_SET = new Set(["struck", "taken", "beaten", "eaten", "built", "hidden", "slain", "thrown", "caught", "broken", "by", "been"]);

// Map raw Wink-NLP string values to our hard-coded execution integer constants
function convertWinkPosToNumeric(posStr, wordStr) {
  let lowerWord = wordStr.toLowerCase();
  
  if (DETERMINER_SET.has(lowerWord)) 													 return POS_DET;
  if (COPULA_AUX_SET.has(lowerWord) || MODAL_AUX_SET.has(lowerWord) || posStr === 'AUX') return POS_AUX;
  if (VERB_FALLBACK_SET.has(lowerWord) || posStr === 'VERB') 							 return POS_VERB;
  if (posStr === 'ADJ' || posStr === 'ADV') 											 return POS_ADV_ADJ;
  if (posStr === 'NOUN' || posStr === 'PROPN' || posStr === 'PRON') 					 return POS_NOUN;
  if (posStr === 'ADP') 																 return POS_ADP;
  
  return POS_UNKNOWN;
}

/*
// Pre-allocated index tracking array to prevent heap garbage collection during transformation
let transformIndexMap = new Int32Array(MAX_TOKENS);

function preProcessPassiveTransformation(wordsArray, posTagsArray, numTokens) {
  let byIdx = -1;
  let auxIdx = -1;
  let i = 0;

  // Track key token positions
  while (i < numTokens) {
    let wordLower = wordsArray[i].toLowerCase();
    if (wordLower === "by") byIdx = i;
    if (posTagsArray[i] === 3) auxIdx = i; // 3 = POS_AUX ("was", "are")
    i = i + 1;
  }

  // If "by" and an auxiliary verb are found, transform the token indices
  if (byIdx > 0 && auxIdx > 0 && byIdx + 1 < numTokens) {
    let writePtr = 0;
    
    // 1. Relocate the true Actor (Nouns following "by") to the front
    let targetIdx = byIdx + 1;
    while (targetIdx < numTokens) {
      transformIndexMap[writePtr] = targetIdx;
      writePtr = writePtr + 1;
      targetIdx = targetIdx + 1;
    }

    // 2. Relocate the core Action Verb
    let verbIdx = auxIdx + 1;
    if (verbIdx < byIdx) {
      transformIndexMap[writePtr] = verbIdx;
      writePtr = writePtr + 1;
    }

    // 3. Relocate the semantic Target (Nouns preceding the auxiliary)
    let originIdx = 0;
    while (originIdx < auxIdx) {
      transformIndexMap[writePtr] = originIdx;
      writePtr = writePtr + 1;
      originIdx = originIdx + 1;
    }

    return writePtr; // Returns the updated length of our active token array
  }

  // If the structure is already active, preserve the default index order
  i = 0;
  while (i < numTokens) {
    transformIndexMap[i] = i;
    i = i + 1;
  }



    let b = 0;
    while (b < finalLength) {
      // Fill the buffer back-to-front using our sorted index maps
      stateMemory[MEM_STK_FRM_SZ + MAX_TOKENS + b] = transformIndexMap[(finalLength - 1) - b];
      b = b + 1;
    }
  
  return numTokens;
}
*/


function preProcessSentenceStructure(wordsArray, posTagsArray, numTokens, outIndexMap, outTimeTracker) {
  let byIdx = -1;
  let auxIdx = -1;
  let verbIdx = -1;
  
  // Reset time tracking metadata outputs
  outTimeTracker[0] = 0; // Tense Flag
  outTimeTracker[1] = -1; // Verb Location

  // 1. Scan for key grammatical markers inline
  for (let i = 0; i < numTokens; i++) {
    let wordLower = wordsArray[i].toLowerCase();
    let pos = posTagsArray[i];

    if (wordLower === "by") byIdx = i;
    if (pos === POS_AUX) auxIdx = i;
    if (pos === POS_VERB) verbIdx = i;

    // Detect past tense markers on verbs or auxiliaries
    if (pos === POS_VERB || pos === POS_AUX) {
      if (wordLower.endsWith("ed") || wordLower === "was" || wordLower === "were" || wordLower === "been" || wordLower === "did") {
        outTimeTracker[0] = 1; // Flag as past tense
        outTimeTracker[1] = i; // Save the raw source verb token reference
      }
    }
  }

  // 2. Structural Transformation Layer (Passive to Active Map Rewrite)
  if (byIdx > 0 && auxIdx > 0 && byIdx + 1 < numTokens) {
    let writePtr = 0;

    // Relocate the true Actor (Nouns following "by") to the front of our evaluation stream
    for (let targetIdx = byIdx + 1; targetIdx < numTokens; targetIdx++) {
      outIndexMap[writePtr] = targetIdx;
      writePtr++;
    }

    // Relocate the core Action Verb (skipping the passive auxiliary)
    let actualVerb = auxIdx + 1;
    if (actualVerb < byIdx) {
      outIndexMap[writePtr] = actualVerb;
      writePtr++;
    }

    // Relocate the semantic Target (Nouns preceding the auxiliary)
    for (let originIdx = 0; originIdx < auxIdx; originIdx++) {
      outIndexMap[writePtr] = originIdx;
      writePtr++;
    }

    return writePtr; // Returns transformed active token array count
  }

  // Fallback: If sentence is already active, map indices one-to-one
  for (let i = 0; i < numTokens; i++) {
    outIndexMap[i] = i;
  }
  return numTokens;
}











// Core Inline Math Token Evaluator
// Strict C-style semantic bigram hashing with zero heap garbage collection
function computeSemanticHashInline(word, outVec) {
	let len = word.length;

	// Clear the static reference vector
	for( let d = 0; d < TOKEN_VEC_DIM; ++d ) {
		outVec[d] = 0.0;
	}

	if (len < 2)
		return;

	for(let i = 0; i < len - 1; ++i) {
		let charCode1 = word.charCodeAt(i);
		let charCode2 = word.charCodeAt(i + 1);

		// Low-overhead string bitwise hashing mechanism
		let hash = (charCode1 << 5) - charCode1 + charCode2;
		let index = (hash < 0 ? -hash : hash) % TOKEN_VEC_DIM;

		outVec[index] = outVec[index] + 1.0; 
		i = i + 1;
	}

	// Inline non-allocating Tanh mathematical normalization 
	for(let d =0; d < TOKEN_VEC_DIM; ++d) {
		let v = outVec[d];
		// Fast algebraic approximation of Math.tanh(v) to maximize execution speed
		let exp2 = Math.exp(2.0 * v);
		outVec[d] = (exp2 - 1.0) / (exp2 + 1.0);
	}
}





// --- 2. THE ZERO-ALLOCATION PARSING SYSTEM CORE ---
function initParserState(numTokens, indexMap ) {
	stateMemory[MEM_STACK_PTR]  	= 0; 
	stateMemory[MEM_BUFFER_PTR] 	= numTokens; 
	stateMemory[MEM_ARC_PTR]    	= 0; 
	//stateMemory[MEM_PASSIVE_FLG] 	= 0; // Wipe our runtime passive context trackers on entry

	
	for (let i = 0; i < numTokens; ++i) {
		// Fill the buffer section backward so the first token is at the execution tip
		stateMemory[MEM_STK_FRM_SZ + MAX_TOKENS + i] = indexMap[(numTokens - 1) - i]; // Pack buffer stack structures back-to-front
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
function executeMacroAction(actionID, wordsArray, s0, b0, stackSize, bufferSize, arcCount) {
	let arcBase = MEM_STK_FRM_SZ + (MAX_TOKENS * 2);


	if (actionID === ACT_SHIFT) { // 0
		stateMemory[MEM_STK_FRM_SZ + stackSize] = b0;
		stateMemory[MEM_STACK_PTR]  = stackSize + 1;
		stateMemory[MEM_BUFFER_PTR] = bufferSize - 1;

/*
		// Clean, readable passive layer validation mapping
		if (tokenPosTags[b0] === POS_AUX && COPULA_AUX_SET.has(wordsArray[b0].toLowerCase())) {
			if (hasPassiveContextInline(bufferSize, wordsArray) === 1) {
				stateMemory[MEM_PASSIVE_FLG] = 1;
			}
		}
		*/
	}


	else if (actionID >= 1 && actionID <= 37) {
		// ACTION: LEFT_ARC (The dependency index matches actionID - 1)
		let udRelation = actionID - 1;
		stateMemory[arcBase + arcCount] = b0; // Parent Head
		stateMemory[arcBase + MAX_TOKENS + arcCount] = s0; // Subject Dependent
		stateMemory[arcBase + (MAX_TOKENS * 2) + arcCount] = udRelation; 
		stateMemory[MEM_ARC_PTR] = arcCount + 1; //Dynamic count up
		stateMemory[MEM_STACK_PTR] = stackSize - 1; //Left-Arc automatically pops stack top element
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
	else if (actionID === ACT_REDUCE) { // 75
		// ACTION: REDUCE
		// Simply pop S0 off the stack to expose the noun beneath it
		stateMemory[MEM_STACK_PTR] = stackSize - 1; //clear modifier element off stack
	}

}



function parseSentenceLoop(wordsArray) {
	let run = 1;

	while (run === 1) {
		let stackSize  = stateMemory[MEM_STACK_PTR];
		let bufferSize = stateMemory[MEM_BUFFER_PTR];
		let arcCount   = stateMemory[MEM_ARC_PTR];
		
		
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
			

/*
			// Live Passive Context Check: Use the shared helper starting exactly from the b0 token pointer
			let isPassive = 0;
			if(b0 !== -1){
				isPassive = determinePassiveContextUniversal(b0, wordsArray, tokenPosTags);
			}
				
			if(isPassive === 1){
				stateMemory[MEM_PASSIVE_FLG] = 1;
			}
			let activePassiveState  = stateMemory[MEM_PASSIVE_FLG];

			// Calculate dot product index signature using live structural indicators
			// Calculate the exact contextual cell matching active vs passive execution tracks
			*/
			let stateFeatureIndex = (s0_pos * NUM_POFSPCH) + b0_pos;
			/*
			if (activePassiveState === 1) {
				// Safely jumps past cell 36 into isolated memory blocks
				stateFeatureIndex += (NUM_POFSPCH * NUMPOFSPCH); // Shift pointer space if passive structures are active
			}
			*/

			// Load semantic vector matrices
			computeSemanticHashInline(s0_word, vecS0);
			computeSemanticHashInline(b0_word, vecB0);

	
			//find the best of the actions to do
			let bestActionID = 0;
			let highestScore = -999999.0;
		  
			let actionIdx = 0;
			while (actionIdx < NUM_ACTIONS) {
				let score = 0.0;
				// Calculate the final memory lookup address without magic offsets
				let baseOffset = (stateFeatureIndex * TOKEN_VEC_DIM * NUM_ACTIONS) + (actionIdx * TOKEN_VEC_DIM);

				for(let dimIdx=0; dimIdx < TOKEN_VEC_DIM; ++dimIdx) {
			  		score = score + (vecS0[dimIdx] + vecB0[dimIdx]) * multiModalWeights[baseOffset + dimIdx];
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
				if (actionIdx === ACT_REDUCE && stackSize > 0 && hasHead(s0, arcCount) === 1 && score > highestScore) {
					highestScore = score;
					bestActionID = actionIdx;
				}
				
				actionIdx = actionIdx + 1;
			}
			
			// --- VERIFICATION TRACKING INJECTS ---
			let actionName = "SHIFT";
			if (bestActionID >= 1 && bestActionID <= 37) actionName = "LEFT_ARC_" + (bestActionID - 1);
			if (bestActionID >= 38 && bestActionID <= 74) actionName = "RIGHT_ARC_" + (bestActionID - 38);

			decisionTraceOut.innerHTML +=
			  `S0: "${s0 !== -1 ? wordsArray[s0] : 'EMPTY'}" (${POStoSTR(s0_pos)}) | ` +
			  `B0: "${b0 !== -1 ? wordsArray[b0] : 'EMPTY'}" (${POStoSTR(b0_pos)}) | ` +
			  `FtIdx: ${stateFeatureIndex} | ` +
			  `Act: ${actionName} (Scr: ${highestScore.toFixed(2)})<br>`
			;
			//`Psv: ${isPassive} | 


			// Fire best action macro updates
			executeMacroAction(bestActionID, wordsArray, s0, b0, stackSize, bufferSize, arcCount);
		}
	}
	
	// --- PLACE THIS IMMEDIATELY AFTER YOUR MAIN RUN===1 LOOP CLOSING BRACE ---
	let stackSize = stateMemory[MEM_STACK_PTR];
	let arcCount  = stateMemory[MEM_ARC_PTR];
	let arcBase   = MEM_STK_FRM_SZ + (MAX_TOKENS * 2);

	// Optimized structural clean-up for copula remnants sitting on the stack
	if (stackSize >= 3) {
		// Pull absolute word tokens out of the top three stack frame frames
		let topWordIdx = stateMemory[MEM_STK_FRM_SZ + stackSize - 1]; // "mouse"
		let midWordIdx = stateMemory[MEM_STK_FRM_SZ + stackSize - 2]; // "is"
		let botWordIdx = stateMemory[MEM_STK_FRM_SZ + stackSize - 3]; // "user"

		// Verify structural syntax format: NOUN ("user") -> AUX ("is") -> NOUN ("mouse")
		if (tokenPosTags[botWordIdx] === POS_NOUN && tokenPosTags[midWordIdx] === POS_AUX && tokenPosTags[topWordIdx] === POS_NOUN) {

			// Draw the final missing nominal subject arc relation (mouse -> user: Label 28)
			stateMemory[arcBase + arcCount] = topWordIdx; // Head ("mouse")
			stateMemory[arcBase + MAX_TOKENS + arcCount] = botWordIdx; // Dependent ("user")
			stateMemory[arcBase + (MAX_TOKENS * 2) + arcCount] = 28; // UD_NSUBJ

			stateMemory[MEM_ARC_PTR] = arcCount + 1;
		}
	}


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
	tokenPosTags[i] = convertWinkPosToNumeric(posArray[i], wordsArray[i]);
  }
  
  // 2. Run the passive to active transformation step
  let finalLength = preProcessSentenceStructure(wordsArray, tokenPosTags, numTokens, outputIndexMap, timeContextTracker);
  
  let isPastTense 		= timeContextTracker[0];
  let mainVerbSrcIndex  = timeContextTracker[1];


  // Bind and run our linear zero-allocation parsing state machine loop
  initParserState(numTokens, outputIndexMap);
  parseSentenceLoop(wordsArray);
  
  // Execute the call to log outputs to your devtools workspace
	printSentenceDependencyGraph(wordsArray);

  
	// --- NEW ARRAYS GRAPH EXTRACTOR FOR MULTI-RELATION SENTENCES ---
	let totalArcs = stateMemory[MEM_ARC_PTR];
	let arcBase   = MEM_STK_FRM_SZ + (MAX_TOKENS * 2);
	let triplesArray = [];

	let a = 0;
	while (a < totalArcs) {
	  let headIdx = stateMemory[arcBase + a];
	  let depIdx  = stateMemory[arcBase + MAX_TOKENS + a];
	  let relType = stateMemory[arcBase + (MAX_TOKENS * 2) + a];

	  // 1. Capture Nominal Subjects (Active and Passive Roots)
	  if (relType === 28) { // UD_NSUBJ
		triplesArray.push({
		  subject: wordsArray[depIdx],
		  predicate: wordsArray[headIdx],
		  object: null, // Will fill downstream if direct objects link to this same head
		  happenedInPast: isPastTense === 1 ? true : false,
		  sourceVerbToken: mainVerbSrcIndex !== -1 ? wordsArray[mainVerbSrcIndex] : null
		});
	  }
	  
	  // 2. Capture Prepositional Noun Modifiers ("legs of the cat")
	  if (relType === 27) { // UD_NMOD
		triplesArray.push({
		  subject: wordsArray[headIdx],
		  predicate: "belongs to",
		  object: wordsArray[depIdx],
		  happenedInPast: isPastTense === 1 ? true : false,
		  sourceVerbToken: mainVerbSrcIndex !== -1 ? wordsArray[mainVerbSrcIndex] : null
		});
	  }
	  a = a + 1;
	}

	// Second pass: Cross-reference direct objects back to their subject templates
	a = 0;
	while (a < totalArcs) {
	  let headIdx = stateMemory[arcBase + a];
	  let depIdx  = stateMemory[arcBase + MAX_TOKENS + a];
	  let relType = stateMemory[arcBase + (MAX_TOKENS * 2) + a];

	  if (relType === 30) { // UD_OBJ
		let t = 0;
		while (t < triplesArray.length) {
		  if (triplesArray[t].predicate === wordsArray[headIdx]) {
		    triplesArray[t].object = wordsArray[depIdx];
		  }
		  t = t + 1;
		}
	  }
	  a = a + 1;
	}

	return triplesArray; // Returns a clean array of facts!

}


function printTriplesArrayToHtml(spoTriples, tripleStorePanelDiv) {
	tripleStorePanelDiv.innerHTML = "=== Knowledge Triples for Storage ===<br>";

	for(let i = 0; i < spoTriples.length; ++i){
		let tenseIndicator = spoTriples[i].happenedInPast ? "[⏱️ PAST]" : "[⏳ PRESENT/ACTIVE]";
		tripleStorePanelDiv.innerHTML += `Parsed Fact:   ( <b>${spoTriples[i].subject}</b>, <i>${spoTriples[i].predicate}</i>, <b>${spoTriples[i].object}</b> )<br>` +
			`Temporal Axis: ${tenseIndicator}<br>` +
			`Source Action: ${spoTriples[i].sourceVerbToken ? spoTriples[i].sourceVerbToken : 'None'}<br>`;
	}
}



decisionTraceOut = document.getElementById("decisionLogOutput");
depGrphTraceOut = document.getElementById("dependencyGraphOutput");

function handleParseRequest() {

	decisionTraceOut.innerHTML = "";
	depGrphTraceOut.innerHTML = "";

	let inputText = document.getElementById("SentenceParseTest").value;
	if(!inputText.trim()) return;
	let tripleDiv = document.getElementById("tripleStoreOutput"); // Fire execution extraction sequence
	let extractedSpoTriples = extractSPO(inputText, window.WinkNLP.nlp); // Render clean triplet data blocks to document storage view panels
	printTriplesArrayToHtml(extractedSpoTriples, tripleDiv);
}







/*
Extending This Architecture to Non-Text ModalitiesThe underlying linear transformation code can scale out to track multi-dimensional structures beyond text strings.Visual Scenes and 3D Bounding BoxesInstead of tracking words ordered sequentially on a page, your input elements in the memory buffer become identified object entities returned from your rendering or perception systems (e.g., bounding box coordinates or 3D polygon meshes).To process a visual scene using this transition engine without dynamic layout alterations:Fill your tokenPosTags array with spatial classification categories instead of speech parts (e.g., 1 for FLOOR, 2 for FURNITURE, 3 for PROP).Rather than using word-adjacency tokens, sort your raw structural elements inside the buffer based on geometric distance metrics or absolute coordinate spaces.Change the 37 output relation constants to reflect Spatial Hierarchy Relationships (e.g., UD_NSUBJ maps to SPATIAL_SUPPORTED_BY, UD_OBJ maps to SPATIAL_CONTAINED_WITHIN, and UD_AMOD maps to SPATIAL_BOUND_TO_BONE).The state machine will process the layout sequentially: it will evaluate a CUP primitive and a TABLE primitive, draw a relational assignment arc, and seamlessly output a structured 3D Scene Graph hierarchy without causing garbage collection overhead.Would you like to adjust the memory block map layout to natively house spatial 3D translation vectors (X, Y, Z) for real-time scene parsing, or should we look at loading standard model arrays into the weightsTable buffer?
*/
