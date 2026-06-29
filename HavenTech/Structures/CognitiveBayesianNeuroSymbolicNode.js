//# sourceURL=Structures/CognitiveBayesianNeuroSymbolicNode.js

class CognitiveNode {

	constructor(dim = 64) {
		this.dim = dim;
		// Trainable "Control" Weights (Simulated as Scalars for Lightness)
		this.weights = {
			lookBack: 1,
			width: 3,
			gateThreshold: 0.4,
		};
		// Recurrent Hidden State (The "Summary")
		this.recurrentState = new Float32Array(dim).fill(0);
		// Knowledge Graph Memory
		this.graphDB = {};
	}
	
	//Hashing with "Meaning" (Semantic Hashing)
	//Standard hashing is "dumb." To make it "smart," we use Letter N-Grams.
	//This ensures that "running," "runner," and "runs" all have very similar hashes because they share character sequences.
	semanticHash(word) {
	  const vec = new Float32Array(this.dim).fill(0);
	  // Break word into 2-character chunks (bigrams)
	  for (let i = 0; i < word.length - 1; i++) {
		const bigram = word.substring(i, i + 2);
		// Use a simple hash to pick a dimension
		let hash = 0;
		for (let j = 0; j < bigram.length; j++) {
		  hash = (hash << 5) - hash + bigram.charCodeAt(j);
		}
		const index = Math.abs(hash) % this.dim;
		vec[index] += 1; 
	  }
	  // Normalize with Tanh so values stay in -1 to 1 range (Bayesian friendly)
	  return vec.map(v => Math.tanh(v));
	}


	// Bayesian Accumulation: AND (Multiplicative)
	// Improved Bayesian "AND" using a Sigmoid Gate to prevent vanishing values
	accumulateAND(windowVector, stateVector) {
		return windowVector.map((val, i) => {
			// Sigmoid(A * B) acts as a soft-logic intersection
			// If both are high, result is high. If either is near zero, result is zero.
			const intersection = 1 / (1 + Math.exp(-(val * stateVector[i])));
			return intersection;
		});
	}

	// Bayesian Accumulation: OR (Additive)
	// Used to merge the local window into the long-term recurrent state
	accumulateOR(localWindow, recurrentState) {
		return localWindow.map((val, i) => {
			const stateVal = recurrentState[i];
			// Novelty/Union logic (Bayesian Sum: P(A) + P(B) - P(A)P(B))
			return val + stateVal - (val * stateVal);
		});
	}
  
	//Centroid vs. Pooling
	//Yes, they are the same thing.
	//In geometry, the centroid is the arithmetic mean position of all points. 
	//In machine learning, Mean Pooling is the process of calculating that centroid.

	//Why do it? It collapses a sequence of
	//tokens into a single "concept vector."
	//The Math: If your window is ["Apple", "Stock", "Price"], the centroid is 
	//the vector that sits exactly in the middle of those three points in high-dimensional space. It represents the "vibe" of the whole phrase.
	calculateCentroid(windowTokens){
		// 1. POOLING: Turn the window of tokens into one "Mean Vector"
		const windowVector = new Float32Array(this.dim).fill(0);
		windowTokens.forEach(t => {
			t.embedding.forEach((val, i) => windowVector[i] += val / windowTokens.length);
		});
		return windowVector;
	}


	findHighestActivation(windowTokens, relevantInfo) {
		let bestToken = null;
		let maxScore = -1;

		windowTokens.forEach(token => {
			// Calculate Cosine Similarity or Dot Product 
			// between this specific token and the "Filtered Signal"
			let score = 0;
			for (let i = 0; i < token.embedding.length; i++) {
				score += token.embedding[i] * relevantInfo[i];
			}

			if (score > maxScore) {
				maxScore = score;
				bestToken = { text: token.text, score: score };
			}
		});

		return bestToken || { text: "unknown", score: 0 };
	}


	process(tokenStream, currentIndex) {
		// 1. Calculate Learned Window
		// Offset looks back, Width decides how many tokens to 'attend' to
		const lookback = this.weights.lookBack;
		const windowSize = this.weights.width; //If lookback=5 and width=3, it examines the last 5 tokens and takes a 3-token window.

		const start = Math.max(0, currentIndex - lookback);
		const windowTokens = tokenStream.slice(start, start + windowSize);

		// 1. CALCULATE CENTROID (The context "summary")
		const centroid = this.calculateCentroid(windowTokens);

		// 2. APPLY BAYESIAN "AND" (Filtering)
		// We filter the centroid through the current state to find 'Relevant New Info'
		const relevantInfo = this.accumulateAND(centroid, this.recurrentState);

		// 3. APPLY BAYESIAN "OR" (Updating)
		// We add that relevant info into our long-term recurrent belief state
		this.recurrentState = this.accumulateOR(relevantInfo, this.recurrentState);

		// 4. GRAPH EXTRACTION (Symbolic "Fact" creation)
		// We look for the most "active" tokens in the window to form an SPO triple
		const bestToken = this.findHighestActivation(windowTokens, relevantInfo);
	  
		if (bestToken.score > this.weights.gateThreshold) {
			//var spoTriple = extractSPO(windowTokens, bestToken.score);
			//if( spoTriple )
			//	this.addToGraph(spoTriple);
		}
	}
	


	addToGraph(spo) {
		if (!this.graphDB[spo.subject]) 
			this.graphDB[spo.subject] = [];
		// Ensure we don't duplicate facts
		const exists = this.graphDB[spo.subject].some(entry => entry.p === spo.predicate && entry.o === spo.object);
		if (!exists) {
			this.graphDB[spo.subject].push( spo );
			console.log("add grph mem: " + spo.subject + " " + spo.predicate + " " + spo.object );
		}
		
		
		//let testEntry = new GraphEntry('testFilter');
		//GRPH_AddEntry(micInputGraph, testEntry);


		//create an object linking to the first one
		//let testEntry1 = new GraphEntry('testSink');
		//let testLink1 = new GraphLink(testEntry, 'connection', 1.0);
		//testEntry1.links['testLink1'] = testLink1;
		
		
		//micInputGraph.activeEntry = testEntry1;
	}


	retrieve(subject) {
		const facts = this.graphDB[subject];
		if (!facts)
			return `I don't know anything about ${subject}.`;
		
		return facts.map(f => `${subject} ${f.predicate} ${f.object}`).join(', ');
	}


	generate(prompt){
		const words = prompt.split(' ');
		var tokens = [];
		for( var wIdx in words ){
			var word = words[wIdx];
			tokens.push( { text: word, embedding: this.semanticHash(word) } );
		}
		tokens.forEach( (_, i) => node.process(tokens, i) );
	}
  
}




/*
function extractSPO(text){

	//let subject = null;
	//let predicate = null;
	//let object = null;
	
	const nlp = window.WinkNLP.nlp;
	let doc = nlp.readDoc( text );
	let tokens = doc.tokens();
	

	// Find the predicate (ROOT verb)
	const rootToken = tokens.filter(
		(token) => token.out('dep') === 'ROOT'
	)[0];
	const predicate = rootToken ? rootToken.out() : null;

	// Find the subject (nsubj or nsubjpass)
	const subjectToken = tokens.filter(
	(token) =>
	  token.out('dep') === 'nsubj' ||
	  token.out('dep') === 'nsubjpass'
	)[0];
	const subject = subjectToken ? subjectToken.out() : null;

	// Find the object (dobj or pobj)
	const objectToken = tokens.filter(
	(token) =>
	  token.out('dep') === 'dobj' ||
	  token.out('dep') === 'pobj'
	)[0];
	const object = objectToken ? objectToken.out() : null;

	return { subject, predicate, object };
}


//demo test of ai parsing

const result = extractSPO("the mouse was chased by the cat");
console.log(result); // { subject: "mouse", predicate: "chased", object: "cat" }
*/

const prompt = "the User likes Javascript";
const node = new CognitiveNode(); //default to word/window embedding vector size of 64
node.generate(prompt);
document.getElementById("showCognitiveBayesianNodeGraph").style.display="";



//libraries to help parse subject predicate object
//spaCy
//MaltParser
//wink-nlp
//compromise.js

//code based small vocabulary huristic for extracting subject predicate object

/*

function extractSPO(text) {
  const tokens = text.toLowerCase().split(/\s+/);
  const triples = [];

  for (let i = 0; i < tokens.length; i++) {
    // Find verb (predicate)
    if (isVerb(tokens[i])) {
      const predicate = tokens[i];
      const subject = findSubject(tokens, i);
      const object = findObject(tokens, i);

      if (subject && predicate) {
        triples.push({ subject, predicate, object: object || "" });
      }
    }
  }

  return triples;
}

function isVerb(word) {
  const verbs = ["chased", "ate", "ran", "is", "has"];
  return verbs.includes(word);
}

function findSubject(tokens, verbIndex) {
  // Look left for the first noun
  for (let i = verbIndex - 1; i >= 0; i--) {
    if (isNoun(tokens[i])) return tokens[i];
  }
  return null;
}

function findObject(tokens, verbIndex) {
  // Look right for the first noun
  for (let i = verbIndex + 1; i < tokens.length; i++) {
    if (isNoun(tokens[i])) return tokens[i];
  }
  return null;
}

function isNoun(word) {
  const nouns = ["cat", "dog", "mouse", "restaurant"];
  return nouns.includes(word);
}

*/
