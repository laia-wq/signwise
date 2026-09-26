// A full-alphabet result is comparable across attempts; short retests are not.
export function fullAlphabetResult(result){
 if(!result||result.total!==26||!Array.isArray(result.results)||result.results.length!==26)return false;
 const ids=result.results.map(r=>r?.letter);
 return new Set(ids).size===26&&ids.every(id=>/^[A-Z]$/.test(id))&&result.results.every(r=>typeof r.correct==='boolean')&&result.correct===result.results.filter(r=>r.correct).length;
}
export function bestAlphabetResult(previous,result){
 if(!fullAlphabetResult(result))return fullAlphabetResult(previous)?previous:null;
 if(!fullAlphabetResult(previous)||result.correct>previous.correct)return result;
 if(result.correct===previous.correct&&Number.isFinite(result.seconds)&&result.seconds<(previous.seconds??Infinity))return result;
 return previous;
}
export function nextStepEligible(result){return fullAlphabetResult(result)&&result.correct>=24;}
