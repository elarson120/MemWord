/*
***********************************************************
*** Jetpack name: LangLadder ***
*** Version: 0.0.6 ***
*** Authors:Erik Larson
*** Contact: planeterik@gmail.com ***
*** Last changes: 28/01/2010 ***
***********************************************************
**TODOS
*Reorganize CSS trees and eliminate unused code blocks
*add filtering
*Finalize flashcard graphics
*investigate use of canvas UI element
*alphabetical sorting
*/

var manifest = {  
	settings: [
		{ name: "nativelang", type: "text", label: "Native Language", default: "en" },
			{ name: "studylang", type: "text", label: "Studying Language", default: "es" },
		{ name: "reversecards", type: "boolean", label: "Reverse Cards?" , default: "false"}
	]
	,
	firstRunPage: '<p>Thanks for installing!  Visit my <a href="http://example.com/myJetpack">homepage</a>.</p>'  
};	

jetpack.future.import("selection");
jetpack.future.import("menu");
jetpack.future.import("storage.simple");
jetpack.future.import("slideBar");

countrycodes={
	"English": "en",
	"Spanish": "es",
	"Italian": "it",
	"French": "fr",
	"German": "de",
	"Portuguese": "pt"
};

/**
* The main flashcard object.  Object is used to store
* data in the storage.simple object.
*/
function Flashcard(forword, definition, sentence, url){
	var d=new Date();
	this.forword=forword;
	this.definition=definition;
	this.dt_added=d;
	this.forword_code=settings["learninglang"];
	this.natword_code=settings["nativelang"];
	this.sentence=sentence;
	this.url=url;
	this.history=this.history || [];
}

/**
* Object to get a lot of performance statistics.  Will be pruned and refined later
*
*/
function FlashcardPerformance(fc){
	var now=new Date();
	this.hasStudied=fc.history.length>0;
	this.lifetimeStats=statsSession(fc,"1/1/1900");
	this.onemonthStats=statsSession(fc,getDaysAgo(30));
	this.oneweekStats=statsSession(fc,getDaysAgo(7));
	this.onedayStats=statsSession(fc,getDaysAgo(1));
	if(this.hasStudied){
		var dt=new Date(fc.history[fc.history.length-1].date);
		this.daysAgoStudied=(now.getTime()-dt.getTime()) / 86400000;//47,617,850
	}else
	{
		this.lastDayStudied=false;
	}
	this.numCardsInRow=numRightInRow(fc,new Date("1/1/1900"));
}

function getLangByCode(langcode){
	var returnLang;
	for(var elem in countrycodes){
		if(countrycodes[elem]==langcode){
			returnLang=elem;
			break;
		}
	}
	return returnLang;
}

function getExponentialAverage(fc, a){
	//console.log(fc);
	var numerator=0;
	var denominator=0;
	for(i=fc.history.length-1;i>=0;i--){
		var days=getDaysAgoFromDate(fc.history[i].date);
		//console.log("date "+ fc.history[i].date);
		//console.log("days "+days);
		var mult=Math.pow(a*(1-a), days);
		denominator+=mult;
		
		if(fc.history[i].correct){
			numerator+=mult;
		}
	}
	//console.log(numerator);
	//console.log(denominator);
	return numerator/denominator;
}




function getColorGrade(score){
	var r,g,b;
	
	if(score<.6){
		score=0;
	}
	
	var adjScore=(score-0.6)/(1.0-0.6);
	
	console.log(score+"   "+adjScore);
	
	if(adjScore<0.5){
		r=255.0;
		g=255.0*(adjScore*2.0);
		b=0;
	}else{
		r=255.0*((1-adjScore)*2.0);
		g=255.0;
		b=0;
	}
	
	var rgbcolor="rgb( " + Math.round(r) + " , " + Math.round(g) + " , " + Math.round(b) + " )";
	return rgbcolor;
}

var gSlider=0; //global variable to point to the slider context
var highlightWord=false; //global variable to set the tool to only highlight words once

//CONST used for flashcard quiz
var backShuffleCards=3;
var correctMultiple=1;
var timesCorrectCutoff=2;

// Create the persistent flashcards array if it doesn't already exist.
jetpack.storage.simple.flashcards = jetpack.storage.simple.flashcards || {};
var flashcards = jetpack.storage.simple.flashcards;

jetpack.storage.simple.settings = jetpack.storage.simple.settings || {};
var settings = jetpack.storage.simple.settings;

jetpack.storage.simple.savedsites = jetpack.storage.simple.savedsites || [];
var savedsites = jetpack.storage.simple.savedsites;

var fcScores=new FCScores();
var currentCard;

// If there are no languages set, the defaul speak English and learning Spanish is used
if(settings["learninglang"]==undefined){
	settings["learninglang"]="es";
}
if(settings["nativelang"]==undefined){
	settings["nativelang"]="en";
}

/**
* Tracks which page the user is reading
*/
jetpack.tabs.onFocus(function(event){
	console.log(this.url);
	currentURL=this.url;
});


/**
* When pages are loaded the text is highlighted
*/
jetpack.tabs.onReady(function(event){
	currentURL=this.url;
	if(highlightWord){
		//showJetpackNote(this.url,"test");
		highlightVocabWords(this.contentDocument);
		highlightWord=false;
	}
});


/**
* Generates scores to figure out the frequency words are shown
*
*/
function generateScore(fc){
	var score=1;
	var perf=new FlashcardPerformance(fc);
	if(perf.numCardsInRow<=1){
		score=6;
	}else if(perf.numCardsInRow<=4){
		score=4;
	}else if(perf.numCardsInRow<=8){
		score=2;
	}else if(perf.numCardsInRow<=16){
		score=1;
	}else{ 
		score=0.5;
	}
	
	if(this.lastDayStudied!=false){
		if(this.lastDayStudied>10){
			score*=2;
		}else if(this.lastDayStudied>4){
			score*=1.5;
		}
	}
	
	//console.log("num in a row "+perf.numCardsInRow);
	//console.log(score);
	return score;
}

/**
* 
*
*/
function FCScores(){
	this.scores={};
	this.scoremin={};
	this.totalScore=0;
	for ( var elem in flashcards ){
		console.log(flashcards[elem]);
		this.scoremin[elem]=this.totalScore;
		this.scores[elem]=generateScore(flashcards[elem]);
		this.totalScore+=this.scores[elem];
	}
	
	console.log(this);
	/*for(var elem in flashcards){
		this.fcpropbs[elem]=fcscores[elem]/totalScore;
	}*/
}

/**
* 
*
*/
function adjustAddFCScore(fc,fcscore){
	var score=generateScore(fc);;
	if(score[fc.forword] != undefined){
		fcscore.totalScore=fcscore.totalScore-fcscore.scores[fc.forword];
	}
	fcscore.scores[fc.forword]+=score;
	fcscore.totalScore=0;
	for ( var elem in flashcards){
		fcscore.scoremin[elem]=fcscore.totalScore;
		fcscore.totalScore+=fcscore.scores[elem];
	}
}

/**
* 
*
*/
function getNextCard(){
	var randNum=getRandomNumber(fcScores.totalScore);
	console.log("Random is "+randNum);
	var fcard;
	for(var elem in flashcards){
		if(randNum>=fcScores.scoremin[elem] && randNum < (fcScores.scoremin[elem]+fcScores.scores[elem])){
			fcard=flashcards[elem];
			break;
		}
	}
	
	return fcard;
}

/**
* 
*
*/
function setUpPerfNumbers(fc){
	var perf=fc.history;
	
	for(i=1;i<=10;i++){
		var itemNum=perf.length-i;
		var id="pp"+i;
		
		if(i>=perf.length){
			$("#"+id,gSlider.contentDocument.body).hide();
		}else{
			$("#"+id,gSlider.contentDocument.body).show()
			if(perf[itemNum].correct){
				$("#"+id,gSlider.contentDocument.body).attr( "src", "http://www.langladder.com/img/thumbs-up-1.png" );
			}else{
				$("#"+id,gSlider.contentDocument.body).attr( "src", "http://www.langladder.com/img/thumbs-down-1.png" );
			}
		}
	}
	var val=getExponentialAverage(fc, 0.5);
	var color=getColorGrade(val);
	console.log("color="+color);
	$("#perfbox",gSlider.contentDocument.body).css("-moz-box-shadow", color +" 2px 2px 4px" );  //"background-color",color);
}

/**
* Search a body of html text for a search term.  If the term is found, a 
*  highlightStart and end tags are inserted before and after the snippet
*/
function doHighlight(bodyText, searchTerm, highlightStartTag, highlightEndTag) 
{
  // the highlightStartTag and highlightEndTag parameters are optional
  if ((!highlightStartTag) || (!highlightEndTag)) {
	highlightStartTag = "<font style='color:blue; background-color:yellow;'>";
	highlightEndTag = "</font>";
  }
  
  var newText = "";
  var i = -1;
  var lcSearchTerm = searchTerm.toLowerCase();
  var lcBodyText = bodyText.toLowerCase();
	
  while (bodyText.length > 0) {
	i = lcBodyText.indexOf(lcSearchTerm, i+1);
	if (i < 0) {
	  newText += bodyText;
	  bodyText = "";
	} else {
	  // skip anything inside an HTML tag
	  if (bodyText.lastIndexOf(">", i) >= bodyText.lastIndexOf("<", i)) {
		// skip anything inside a <script> block
		if (lcBodyText.lastIndexOf("/script>", i) >= lcBodyText.lastIndexOf("<script", i)) {
			if ((lcBodyText.substr(i-1, 1)===" "&&lcBodyText.substr(i+searchTerm.length,1)===" "))//||(lcBodyText.substr(i-1, 1)===" "&&lcBodyText.substr(i+searchTerm.length)===".")) 
			{ 
			 newText += bodyText.substring(0, i) + highlightStartTag + bodyText.substr(i, searchTerm.length) + highlightEndTag;
			  bodyText = bodyText.substr(i + searchTerm.length);
			  lcBodyText = bodyText.toLowerCase();
			  i = -1;
			}
		}
	  }
	}
  }
  
  return newText;
}

/**
* Iterates through list of flashcards and iteratively adds
* highlighting to the page defined in the context object.
*/
function highlightVocabWords(context){
	var htmlText=$("body",context).html();

	for ( var elem in flashcards){	
		var val = getExponentialAverage( flashcards[elem], 0.2);
		var color = getColorGrade( val );
		var highlightStartTag="<span style='color:black;background-color:"+color+";'>"
		var highlightEndTag="</span>";
		htmlText=doHighlight(htmlText, flashcards[elem].forword, highlightStartTag, highlightEndTag);
	}
	try{
	$("body",context).html(htmlText);
	}catch(error){
		console.log(error);
	}
}

/**
* Add buttons to the status bar. 
* 
*/
//TODO: Fix the size of the status bar so that everything fits and is clearly viewable
jetpack.statusBar.append({ 
	html: '<P style="padding-top:0px; padding-bottom:20px; margin:0px; cursor:pointer;">Add Site</P>', 
	width: 50,
	onReady: function(widget){	
		$("P",widget).click(function(){
			var arr = jQuery.grep(savedsites, function(n, i){
				return (n.url==jetpack.tabs.focused.url);
			});
			console.log(arr);
			if(arr.length==0){
				savedsites.push({name: jetpack.tabs.focused.contentDocument.title, url: jetpack.tabs.focused.url});
				refreshFavorites();
				showJetpackNote(jetpack.tabs.focused.contentDocument.title + " saved.","Saved");
			}else{
				showJetpackNote("You already saved "+ jetpack.tabs.focused.contentDocument.title + ".","Not Saved");
			}
		});
	}
});

/**
* Adds context menu item
* 
*/
jetpack.menu.context.page.add({	 
   label: "Add to LangLadder",	 
   command: function (event) { 
		var sentence="";
		var vocabWord=jetpack.selection.text.trim();
		jetpack.selection.html="<span id='"+ vocabWord.toLowerCase() +"' class='vocabword' style='background: red'>" +
		jetpack.selection.html + "</span>";
		var doc=jetpack.tabs.focused.contentDocument;
		var parents=$("#"+vocabWord.toLowerCase(),doc).parents();
		//console.log(parents);
		for(i=1;i<parents.length;i++){
			if(parents[i].tagName=="P"||parents[i].tagName=="DIV"||parents[i].tagName=="BODY"||parents[i].tagName=="HTML"){
				var innertext=parents[i].textContent;
				var regexTxt=new RegExp("[^.]+"+vocabWord+"[^.]+","im");
				sentence=regexTxt.exec(innertext);
				console.log(sentence);
				break;
			}
		}
		translateStringFromPage(vocabWord.toLowerCase(), settings["learninglang"], settings["nativelang"],sentence);
	 }
}); 



/**
* Add the perf info to a given flashcard
*/
function FCPerfAdd(flashcard, wascorrect){
	var d=new Date();
	flashcard.history.push({date: d, correct: wascorrect}); 
	console.log(flashcard);
}



/**
* Adds the 
*/
/*
function FCQuizResultsAdd(flashcard, level, perc, total){
	var d=new Date();
	flashcard.quizResults.push({date: d, level: level, percentage: perc, totalreps: total}); 
   	console.log(flashcard);
}
*/

/**
* Returns the number of times correct in a row that a user has had in a row
*/
function numRightInRow(fc, lastBegin){
	var numRight=0;
	//console.log("*******************************"+fc.history.length)
	for(i=fc.history.length-1;i>=0;i--){
		//console.log("history is "+fc.history[i].date);

		if(fc.history[i].correct){//  && fc.history[i].date>=lastBegin){
			 numRight=numRight+1;
			 //console.log("num going up " + numRight);
	 	}else{
			break;
		}
	}
	
	return numRight;
}

/**
* Returns the number of times seen and number of times correct since a given date
*/
function statsSession(fc, lastBegin){
	var sessionPerf=jQuery.grep(fc.history, function(n, i){
		return n.date>=lastBegin;
	});

	var numRepititions=sessionPerf.length;
	var correctArray=jQuery.grep(sessionPerf, function(n, i){
		return n.correct;
	});
	var numCorrect=correctArray.length;

	return {numReps: numRepititions, numCorrect: numCorrect};
}

/**
* Returns the percentage correct in the last n number of iterations seen
*/
function percCorrectByN(fc, n){
	var numCorrect=0;
	for(i=0;i<n;i++){
		if(fc.history[fc.history.length-1-i]){
			numCorrect++;
		}
	}
	
	return numCorrect/n;
}

/**
* Get date specified by number of days ago
*/
function getDaysAgo(days){
	var today=new Date();
	var returnDt=new Date();
	returnDt.setDate(today.getTime()-(days*86400000));
	return returnDt;
}

/**
* Get date specified by number of days ago
*/
function getDaysAgoFromDate(dt){
	var today=new Date();
	dt=new Date(dt);
	var diff_date=today-dt;
	
	//var num_years = diff_date/31536000000;
	//var num_months = (diff_date % 31536000000)/2628000000;
	//var num_days = ((diff_date % 31536000000) % 2628000000)/86400000;
	var num_days = diff_date / 86400000;
	
	return num_days;
}


function handleNextCardSelect(){
	
}

/**
* 
*/
function handleResults(fc, lastBegin){
	var numinarow=numRightInRow(fc,lastBegin);
	var sessionStats=statsSession(fc,lastBegin);
	var sessionPerf=sessionStats.numCorrect/sessionStats.numReps;
	console.log(numinarow);
	console.log(sessionStats);
 
	if(numinarow>=timesCorrectCutoff){
		if(sessionStats.sessionPerf<.6){
			FCQuizResultsAdd(fc, 1, sessionPerf, sessionStats.numReps);
		}else if(sessionStats.sessionPerf<.8){
			FCQuizResultsAdd(fc, 2, sessionPerf, sessionStats.numReps);
		}else{
			FCQuizResultsAdd(fc, 3, sessionPerf, sessionStats.numReps);
		}
	}else{
		var backShuffle=(numinarow+1)*backShuffleCards*correctMultiple;
		fcqueue=insertInArray(fc, fcqueue, backShuffle);
	}
}

/**
* Inserts an item in an array in a certain position
*/
function insertInArray(item, array, position){
	if(position>array.length){
		position=array.length;
	}
	var beginArray=array.slice(0,position);
	var endArray=array.slice(position);
	beginArray.push(item);
	var returnArray=Array.concat(beginArray, endArray);
	return returnArray;
}

/**
* Translates word from sourcelang into destlang.  Adds those and sentence into flashcard
*/
function translateStringFromPage(word, sourcelang, destlang, sentence){		
	var translation;
	console.log(word+sourcelang+destlang);
	$.getJSON("http://ajax.googleapis.com/ajax/services/language/translate?v=1.0&q=" + word	 +"&langpair="+sourcelang+"%7C"+destlang,
	function(data){
		translation=data.responseData.translatedText.trim().toLowerCase();
		flashcards[word]=new Flashcard(word,translation,sentence,currentURL);
		console.log(flashcards);
		showJetpackNote(word+"="+translation+"\r"+sentence,"Word Added");
		refreshVocabwords();
	});
}
 
function translateStringForSearch(word, sourcelang, destlang){
	var translation;
	
	$.ajax({
		url: "http://ajax.googleapis.com/ajax/services/language/translate?v=1.0&q=" + word +"&langpair="+sourcelang+"%7C"+destlang,
		async: false,
		dataType: 'json',
		success: function(data){
			translation=data.responseData.translatedText.trim().toLowerCase();
			$("#searchinput",gSlider.contentDocument.body).val(translation);
		}
	});
	/*
	$.getJSON("http://ajax.googleapis.com/ajax/services/language/translate?v=1.0&q=" + word	 +"&langpair="+sourcelang+"%7C"+destlang,
	function(data){
		translation=data.responseData.translatedText.trim().toLowerCase();
		flashcards[word]=new Flashcard(word,translation,sentence,currentURL);
		console.log(flashcards);
		showJetpackNote(word+"="+translation+"\r"+sentence,"Word Added");
		refreshVocabwords();
	});*/
}

/**
* Jetpack notifications
*/
function showJetpackNote(body, title){
	jetpack.notifications.show({
		title: title,
		body: body,
		icon: "http://langladder.com/img/ladder.gif"
	});
}
 
function getRandomNumber(maxNumber){
	return Math.random()*maxNumber;
}

/**
* Opens a new tab loaded with a website
* 
*/
function openNewTab(webSite, switchtotab){
	var tab=jetpack.tabs.open(webSite,true);
	highlightWord=true;
	/*
	$(tab.contentDocument).ready(function(){
		console.log("got here");
		//highlightVocabWords(tab.contentDocument);
		showJetpackNote("test","test");
	});
*/	
	if(switchtotab){
		tab.focus();
	}
}


 /****************************/
/**
* Javascript that I needed to modify.  Handles inline forms
*/
(function($){
/*
 * Editable 1.3.3
 *
 * Copyright (c) 2009 Arash Karimzadeh (arashkarimzadeh.com)
 * Licensed under the MIT (MIT-LICENSE.txt)
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Date: Mar 02 2009
 */
$.fn.editable = function(options){
	var defaults = {
		onEdit: null,
		onSubmit: null,
		onCancel: null,
		editClass: "editClassRock",
		submit: null,
		cancel: null,
		type: 'text', //text, textarea or select
		submitBy: 'blur', //blur,change,dblclick,click
		editBy: 'click',
		options: null,
		context: null
	}
	if(options=='disable')
		return this.unbind(this.data('editable.options').editBy,this.data('editable.options').toEditable);
	if(options=='enable')
		return this.bind(this.data('editable.options').editBy,this.data('editable.options').toEditable);
	if(options=='destroy')
		return  this.unbind(this.data('editable.options').editBy,this.data('editable.options').toEditable)
					.data('editable.previous',null)
					.data('editable.current',null)
					.data('editable.options',null);
	
	var options = $.extend(defaults, options);
	
	options.toEditable = function(){
		$this = $(this);
		$this.data('editable.current',$this.html());
		opts = $this.data('editable.options');
		$.editableFactory[opts.type].toEditable($this.empty(),opts);
		// Configure events,styles for changed content
		$this.data('editable.previous',$this.data('editable.current'));
		//$this.children()
			//	.focus();
				//.addClass(opts.editClass);
		// Submit Event
		if(opts.submit){
			$('<button/>').appendTo($this)
						.html(opts.submit)
						.one('mouseup',function(){opts.toNonEditable($(this).parent(),true)});
		}else
			$this.one(opts.submitBy,function(){opts.toNonEditable($(this),true)});
			$this.children()
				 	.one(opts.submitBy,function(){opts.toNonEditable($(this).parent(),true)});
		
		// Cancel Event
		if(opts.cancel)
			$('<button/>').appendTo($this)
						.html(opts.cancel)
						.one('mouseup',function(){opts.toNonEditable($(this).parent(),false)});
		// Call User Function
		if($.isFunction(opts.onEdit))
			opts.onEdit.apply(	$this,
									[{
										current:$this.data('editable.current'),
										previous:$this.data('editable.previous')
									}]
								);
	}
	options.toNonEditable = function($this,change){
		opts = $this.data('editable.options');
		// Configure events,styles for changed content
		
		$this.one(opts.editBy,opts.toEditable)
			 .data( 'editable.current',
				    change 
						?$.editableFactory[opts.type].getValue($this,opts)
						:$this.data('editable.current')
					)
			 .html(
				    opts.type=='password'
				   		?'*****'
						:$this.data('editable.current')
					);
		// Call User Function
		var func = null;
		if($.isFunction(opts.onSubmit)&&change==true)
			func = opts.onSubmit;
		else if($.isFunction(opts.onCancel)&&change==false)
			func = opts.onCancel;
		if(func!=null)
			func.apply($this,
						[{
							current:$this.data('editable.current'),
							previous:$this.data('editable.previous')
						}]
					);
	}
	this.data('editable.options',options);
	return  this.one(options.editBy,options.toEditable);
}
$.editableFactory = {
	'text': {
		toEditable: function($this,options){
			$('<input/>',options.context).appendTo($this)
						 .val($this.data('editable.current'));
		},
		getValue: function($this,options){
			return $this.children().val();
		}
	},
	'password': {
		toEditable: function($this,options){
			$this.data('editable.current',$this.data('editable.password'));
			$this.data('editable.previous',$this.data('editable.password'));
			$('<input type="password"/>').appendTo($this)
										 .val($this.data('editable.current'));
		},
		getValue: function($this,options){
			$this.data('editable.password',$this.children().val());
			return $this.children().val();
		}
	},
	'textarea': {
		toEditable: function($this,options){
			$('<textarea/>').appendTo($this)
							.val($this.data('editable.current'));
		},
		getValue: function($this,options){
			return $this.children().val();
		}
	},
	'select': {
		toEditable: function($this,options){
			$select = $('<select/>').appendTo($this);
			$.each( options.options,
					function(key,value){
						$('<option/>').appendTo($select)
									.html(value)
									.attr('value',key);
					}
				   )
			$select.children().each(
				function(){
					var opt = $(this);
					if(opt.text()==$this.data('editable.current'))
						return opt.attr('selected', 'selected').text();
				}
			)
		},
		getValue: function($this,options){
			var item = null;
			$('select', $this).children().each(
				function(){
					if($(this).attr('selected'))
						return item = $(this).text();
				}
			)
			return item;
		}
	}
}
})(jQuery);

/**
* Refreshes the favorites pane
* 
*/
function refreshFavorites(){
	$("#savedlinksul", gSlider.contentDocument.body).empty();
	for ( i=0;i<savedsites.length;i++){
		var lineItem='<div class="linkdiv" id="'+savedsites[i].name+'"><div style="position:absoulte;overflow:hidden;padding:0;height:15;width:300;top:0;left:0"><span class="savedlink linkUrl" id="'+savedsites[i].url + '">' + savedsites[i].name + '</span></div>';
		lineItem+='<div class="linkiconzone" style="margin-top:5"><img class="editlink" style="cursor:pointer" src="http://www.langladder.com/img/document-edit-1.png"/><img class="deletelink" style="cursor:pointer" src="http://www.langladder.com/img/trash-1.png"/></div></div>';
		$("#savedlinksul", gSlider.contentDocument.body).append(lineItem);
	};
	$(".savedlink", gSlider.contentDocument.body).click(function(event){
		var url=$(this).attr('id');
		openNewTab(url, true);
	});
	
	$('.linkiconzone', gSlider.contentDocument.body).css("visibility","hidden");
	$(".linkdiv", gSlider.contentDocument.body).hover(function(){
		$(this).find(".linkiconzone", gSlider.contentDocument.body).css("visibility","visible");;
	},function(){
		$(this).find(".linkiconzone", gSlider.contentDocument.body).css("visibility","hidden");
	});
	
	$('.editlink', gSlider.contentDocument.body).click(function(event){
		console.log("edit this");
		$(this).parent().parent().find(".savedlink").unbind();
		$(this).parent().parent().find(".savedlink").editable({onSubmit:onEditLink, context: gSlider.contentDocument.body});
		$(this).parent().parent().find(".savedlink").triggerHandler("click");
		//$("#theone").unbind
	//	unbind('click', aClick)
		
	});
	$('.deletelink', gSlider.contentDocument.body).click(function(event){
		console.log("delete this");
		var savedSite=$(this).parent().parent().attr( "id" );
		
		for(i=0;i<savedsites.length;i++){
			if(savedsites[i].name==savedSite){
				savedsites.splice(i,1);
				break;
			}
		}
		
		$(this).parent().parent().hide();
	});
}

function onEditLink(content){
	for(i=0;i<savedsites.length;i++){
		if(savedsites[i].url==$(this).attr("id")){
			savedsites[i].name=content.current;
			break;
		}
	}
	$(this).unbind();
	$(this).click(function(event){
		var url=$(this).attr('id');
		openNewTab(url, true);
	});
}

/**
* 
* TODO
*/
function onEdit1(content){
	var vocabword;
	switch($(this).attr( "class" )){
		case "vocabword":
			vocabword=$(this).parent().parent().attr("id");
			console.log(vocabword);
			var tempCard=flashcards[vocabword];
			tempCard.forword=content.current;
			delete flashcards[vocabword];
			flashcards[content.current]=tempCard;
			refreshVocabwords();
			break;
		case "translationword":
			vocabword=$(this).parent().parent().attr("id");
			flashcards[vocabword].definition=content.current;
			break;
		case "samplesentence":
			vocabword=$(this).parent().parent().attr("id");
			//flashcards[vocabword].sentence=content.current;
			break;
		
	}
	console.log(vocabword);
	//console.log($(this).parents("div"));//.attr("id")".vocabitem"
  	//console.log(content.current+':'+content.previous)
	//console.log(this);
}


/**
* Refreshes the vobab word pane
*/
function refreshVocabwords(){
	$("#editcarddiv", gSlider.contentDocument.body).empty();
	var keys=[];
	for ( var elem in flashcards){
		keys.push(elem);
	}
	keys.sort();

	for (i=0;i<keys.length;i++){		
		var elem=keys[i];
		
		var html='<div class="vocabitem" id="'+flashcards[elem].forword+'"><div class="vacabelement"><img class="expandcontract" src="http://www.langladder.com/img/plus-1.png"/>';
		html=html+'<span class="vocabword">'+ flashcards[elem].forword +'</span><div style="float:right"><span class="gradecircle" style="position:absolute; background:red; width:16; height:16; -moz-border-radius: 8px"/>';
		html=html+'<img class="trashicon" style="position:relative;float:right;left:15;margin-right:32" src="http://www.langladder.com/img/trash-2.png" /></div></div><div class="vocabexpand">';
		html=html+'<div class="translationword" >'+ flashcards[elem].definition +'</div>';
		html=html+'<div class="nextscheduled" style="left:180;top:;width:80;position:absolute;"></div>';
		html=html+'<div class="samplesentence" style="overflow:hidden">'+ flashcards[elem].sentence +'</div>';
		html=html+'<div class="weblink linkUrl">'+ flashcards[elem].url +' </div></div></div>';
		$("#editcarddiv", gSlider.contentDocument.body).append(html);
	};
	
	$(".deletebtn", gSlider.contentDocument.body).click(function(event){
		 delete flashcards[$(this).parent().parent().attr("id")];
		 $(this).parent().parent().toggle();//.css("border","9px solid red");
	});
	
	for(var elem in flashcards){
		var val = getExponentialAverage( flashcards[elem], 0.2);
		var color = getColorGrade( val );
		$("#"+flashcards[elem].forword, gSlider.contentDocument.body).find(".gradecircle").css("background",color);
	}
	
	/*
	var script = $.ajax({
	  url: "http://langladder.com/jquery.editable-1.3.3.js",
	  async: false
	 }).responseText;
	
	eval(script);
	*/
	//$('.vocabword', gSlider.contentDocument.body).editable({onSubmit:onEdit1, context: gSlider.contentDocument.body});
	$('.translationword', gSlider.contentDocument.body).editable({onSubmit:onEdit1, context: gSlider.contentDocument.body});
	$('.samplesentence', gSlider.contentDocument.body).editable({onSubmit:onEdit1, context: gSlider.contentDocument.body});

	$('.vocabexpand', gSlider.contentDocument.body).hide();
	$(".expandcontract", gSlider.contentDocument.body).click(function(){
		console.log($(this).attr('src'));
		if($(this).attr('src')==='http://www.langladder.com/img/plus-1.png'){
			expandItem($(this).parent().parent());
		}
		else {
			contractItem($(this).parent().parent());
		}
	});
	
	$('#weblink', gSlider.contentDocument.body).click(function(){
		var text=$(this).innerText;
		openNewTab(text, true);
	});

	$('#filterselect', gSlider.contentDocument.body).change(function(){
	  	console.log($(this));
	});

	$("img.trashicon", gSlider.contentDocument.body).hover(function(){
			$(this).attr("src", "http://www.langladder.com/img/trash-1.png");
	},function(){
			$(this).attr("src", "http://www.langladder.com/img/trash-2.png");
	});
	
	$("img.trashicon", gSlider.contentDocument.body).click(function(){
		delete flashcards[$(this).parent().parent().parent().attr("id")];
		$(this).parent().parent().parent().hide();
	});
}



/**
* 
* 
*/
function expandItem(element){
	console.log("expand");
	element.find('.expandcontract').attr('src','http://www.langladder.com/img/minus-1.png');
	element.find('.vocabexpand').show();
	element.height( 170 );
}

/**
* 
* 
*/
function contractItem(element){
	console.log("collapse");
	element.find('.vocabexpand').hide();
	element.find('.expandcontract').attr('src','http://www.langladder.com/img/plus-1.png');
	element.height( 50 );
}
/******************************/
jetpack.slideBar.append({
	icon: "http://langladder.com/img/ladder.gif",
	width: 350,
	persist: true,
	onClick: function (slider) {
		gSlider=slider;
		console.log(jetpack.tabs);
	
		//***************Sets buttons and tabs at top to proper positions***********
		$(".tab", slider.contentDocument.body).css("font-weight","normal");
		$(".pane", slider.contentDocument.body).hide();
		$("#startingout", slider.contentDocument.body).show();
		//$("#quizpane", slider.contentDocument.body).show();
		$("#startingtab", slider.contentDocument.body).css("font-weight","bold");
			
		$("#startingtab", slider.contentDocument.body).click(function(event){
			$(".tab", slider.contentDocument.body).css("font-weight","normal");
			$(this).css("font-weight","bold");
			$(".pane", slider.contentDocument.body).hide();
			$("#startingout", slider.contentDocument.body).show();
		});		
		
		$("#wordedittab", slider.contentDocument.body).click(function(event){
			$(".tab", slider.contentDocument.body).css("font-weight","normal");
			$(this).css("font-weight","bold");
			$(".pane", slider.contentDocument.body).hide();
			$("#editcards", slider.contentDocument.body).show();
		});
		
		$("#quiztab", slider.contentDocument.body).click(function(event){
			$(".tab", slider.contentDocument.body).css("font-weight","normal");
			$(this).css("font-weight","bold");
			$(".pane", slider.contentDocument.body).hide();
			$("#quizpane", slider.contentDocument.body).show();
		});
	
		
		//***********Handles functions on gettingstarted tab**********************************
		$(".learninglink", slider.contentDocument.body).click(function(event){
			var searchterm=$("#searchinput",slider.contentDocument.body).val();
			translateStringForSearch(searchterm, settings["nativelang"],settings["learninglang"]);
			var searchterm=$("#searchinput",slider.contentDocument.body).val();
			
			switch($(this).attr( "id" ))
			{
				case "websearch":
					openNewTab("http://www.google.com/search?hl="+settings["nativelang"]+"&as_q="+searchterm+"&num=30&lr=lang_"+settings["learninglang"]+"&ft=i&as_qdr=all&as_occt=any&safe=images", true);
					break;
				case "blogsearch":
					openNewTab("http://blogsearch.google.com/blogsearch?hl="+settings["nativelang"]+"&num=30&lr=lang_"+settings["learninglang"]+"&ft=i&safe=images&um=1&ie=UTF-8&q="+searchterm+"&sa=N&tab=wb", true);
					break;
				case "booksearch":
			  		openNewTab("http://www.google.com/search?hl="+settings["nativelang"]+"&q="+searchterm+"+site%3Agutenberg.org&lr=lang_"+settings["learninglang"]+"&aq=f", true);
			  		break;
				case "youtubesearch":
			  		openNewTab("http://www.google.com", true);
			  		break;
				default:
			  		console.log("error..");
			}
		});
		$('#searchinput', slider.contentDocument.body).addClass("idleField");	 
		$('#searchinput', slider.contentDocument.body).focus(function() {	
			$(this).removeClass("idleField").addClass("focusField");  
			if (this.value == this.defaultValue){	
				this.value = '';  
			}	
			if(this.value != this.defaultValue){  
				this.select();	 
			}	
	 	});  
	
		
	
	 	$('#searchinput', slider.contentDocument.body).blur(function() {  
			$(this).removeClass("focusField").addClass("idleField");  
		 	if ($.trim(this.value == '')){	 
				this.value = (this.defaultValue ? this.defaultValue : '');	 
			}	
		});   
		
		$('#searchinput', slider.contentDocument.body).val("search here in " + getLangByCode(settings["learninglang"]) + " or " + getLangByCode(settings["nativelang"]));
		
		$("#nativelangselect", slider.contentDocument.body).change(function(event){
			settings["nativelang"]=countrycodes[$(this).val()];
			console.log(countrycodes[$(this).val()]);
			$('#searchinput', slider.contentDocument.body).val("search here in " + getLangByCode(settings["learninglang"]) + " or " + getLangByCode(settings["nativelang"]));
		});
		
		$("#foreignlangselect", slider.contentDocument.body).change(function(){ 
			settings["learninglang"]=countrycodes[$(this).val()];
			console.log(countrycodes[$(this).val()]);
			$('#searchinput', slider.contentDocument.body).val("search here in " + getLangByCode(settings["learninglang"]) + " or " + getLangByCode(settings["nativelang"]));
		});
		
		refreshFavorites();
		
	
		//***********Handles functions on see cards tab**********************************/
		refreshVocabwords();
		$('.linkUrl', slider.contentDocument.body).hover(function() {	
			//console.log("hovering");
			//$(this).css("font-weight","bold");
			$(this).css("color","blue");
		},function(){
			//$(this).css("font-weight","normal");
	 		$(this).css("color","black");
		});
	
		//************Handles functions on quiz tab***********************************
		var lastBegin=new Date();
		var numCorrect=0;
		var numSeen=0;
		$(".cardclass", slider.contentDocument.body).hide();
		$(".resultbtn", slider.contentDocument.body).css("visibility","hidden");
	
		
		$("#card", slider.contentDocument.body).one( "click" ,function(event){
			console.log("#newquizbtn was clicked");
			
			lastBegin=new Date();
			numCorrect=0;
			numSeen=0;
			SetUpCard();
			$("#card", slider.contentDocument.body).css("cursor","default")
			$(".cardclass", slider.contentDocument.body).show();
		})
		
		function SetUpCard(){
			numSeen=numSeen+1;
			
			currentCard=getNextCard();
			console.log("0.5 average is " + getExponentialAverage(currentCard, 0.5));
			console.log("0.25 average is " + getExponentialAverage(currentCard, 0.25));
			console.log("0.1 average is " + getExponentialAverage(currentCard, 0.1));
			
			setUpPerfNumbers(currentCard);
			
			if(true)
				$("#quizword", slider.contentDocument.body).text(currentCard.definition);
			else
				$("#quizword", slider.contentDocument.body).text(currentCard.forword);
		}
		
		function FlipCard(){
			if($("#quizword", slider.contentDocument.body).text()!=currentCard.definition){
				$("#quizword", slider.contentDocument.body).text(currentCard.definition);
			}
			else{
				$("#quizword", slider.contentDocument.body).text(currentCard.forword);
			}
		}
		
		$("#flipbtn", slider.contentDocument.body).click(function(event){
			console.log("card flipped");
			$(".resultbtn", slider.contentDocument.body).css("visibility","visible");
			FlipCard();
		});
		
		$("#correctbtn", slider.contentDocument.body).click(function(event){
			console.log("#correctbtn was clicked");
			numCorrect=numCorrect+1;
			FCPerfAdd(currentCard, true);
			$(".resultbtn", slider.contentDocument.body).css("visibility","hidden");
			adjustAddFCScore(currentCard,fcScores);
			SetUpCard();
		});
		
		$("#inccorrectbtn", slider.contentDocument.body).click(function(event){
			console.log("#inccorrectbtn was clicked");
			FCPerfAdd(currentCard, false);
			$(".resultbtn", slider.contentDocument.body).css("visibility","hidden");
			adjustAddFCScore(currentCard,fcScores);
			SetUpCard();
		});
		
		//******************Related To Settings***************************************
		$("#nativelangselect", slider.contentDocument.body).val(settings["nativelang"]);
		$("#foreignlangselect", slider.contentDocument.body).val(settings["learninglang"]);
		
		
	
			
		$("#reverseselect", slider.contentDocument.body).val(settings["reversecards"]);
		$("#reverseselect", slider.contentDocument.body).change(function(event){
			settings["reversecards"]=$(this).val();
			console.log($(this));//.val());
		});
		
  },
	//*******************HTML for Slidebar******************************************
  html: <>
	<style><![CDATA[
	* {margin:0;padding:0}
	body { color: #000000; background: #F2F2F2; margin:0;padding:0; font:1.5em Arial,cambria,palatino,georgia,serif; font-size:13px; font-size-adjust:none; font-style:normal; font-variant:normal;font-weight:normal; line-height:normal;}
	h1 {font-size:38px ;margin: 10px; text-align: center; vertical-align: middle; }
	.tabtable { width: 310px; margin-left:auto; margin-right:auto; border-collapse: collapse;}
	.tab { text-align: center; padding: 4px; margin: 0px; width:90px; border-style:solid; border-width:1px; border-color:solid gray; cursor:pointer;font-size:13px; -moz-border-radius-topleft:4px;-moz-border-radius-topright: 4px;}
	.btn { text-align: center; padding: 4px; margin: 0px; width:90px; border-style:solid; border-width:1px; border-color:solid gray; cursor:pointer;font-size:13px; -moz-border-radius:4px;background: -moz-linear-gradient(top, white, #F2F2F2); }
	li.btn {display:block;float:left;display:inline; }
	.bdy { position1:absolute: margin-left:10px; margin-right:10px; height:70%;	 margin:0px; width:350px;}
	.pane { position:absolute; margin-left:10px; width:330; height:750px; background: grey; border-style: solid; border-width:1px; border-color:gray;}
	div.scoretab { position:absolute; right:0px; top:0px; font-weight:bold;margin: 5px;  border-style:solid; border-width:2px;width:120px; }
	ul.btngroup {display:block; list-style-type:none;margin:0;padding:0; margin:7; width:330px}
	li.tab {display:block;float:left;display:inline; background: -moz-linear-gradient(top, white, #F2F2F2); }//, #F8F0F8
	div#card { }
	p#quizword {text-align:center; font-size:25px;}

	
	#searchinput {	  padding:5px;	 outline:none;	height:36px;  }	 
	.focusField {	border:solid 2px #73A6FF;  background:#EFF5FF;	color:#000;	 }	
	.idleField {  background:#EEE;	 color: #6F6F6F;  border: solid 2px #DFDFDF;  }	 
	.linkdiv {  border-bottom-style: solid; border-bottom-width:1px; border-bottom-color:black;width:100%; height:35;padding:5}
	.savedlink { font-size:12px; cursor:pointer; }
	
	
	li.tab:link				{ color: black;  text-decoration:none;  opacity: .7 ; background: -moz-linear-gradient(top, white, #2B60DE);}
	li.tab:visited			{ color: black;  text-decoration:none;  opacity: .7;background: -moz-linear-gradient(top, white, #2B60DE);}
	li.tab:hover			{ color: black; text-decoration:none;	 opacity: 1;background:	 -moz-linear-gradient(top, white, #2B60DE);}
	li.tab:active			{ color: black; text-decoration:none;	 opacity: 1;background: -moz-linear-gradient(top, white, #2B60DE);}
	li.savedlink:link		{ color: black;  text-decoration:none;  opacity: .7;color: #2B60DE;}
	li.savedlink:visited	{ color: black;  text-decoration:none;  opacity: .7;color: #2B60DE;}
	li.savedlink:hover		{ color: black; text-decoration:none;	 opacity: 1;color:	#2B60DE;}
	li.savedlink:active		{ color: black; text-decoration:none;	 opacity: 1;color: #2B60DE;}	

	
	/*new part*/
	div.vocabitem {position1: absolute;width:310px;height:50;border-width:1px;border-color:gray;border-style:solid; font-size:18; background: -moz-linear-gradient(top, white, grey);  }
	.vacabelement {margin-top:14;}
	img {vertical-align: top; } 
	.trashicon {visibility:visible;margin-right:15;cursor:pointer;}
	.expandcontract {margin-left:10;cursor:pointer;}
	.vocabexpand {position:absolute;margin-left:46px;margin-top:10px;width:100%;}
	.translationword {font-style: italic; left:0px;top:0px;width:80;position:absolute;}
	.vocabword {font-weight:bold;padding:16;}
	.nextscheduled {font-size:10px;}
	.samplesentence {font-size:13px;top:30;width:250;height:47;position:absolute;}
	.weblink {font-size:10px;top:95;width:270;position:absolute;}
	.linkUrl {cursor:pointer}
	
	/*Quiz section*/
	.perfpic {display1:none}
	
	]]></style>
	<body>
		<div class="hdr">
			<h1 style="cursor:pointer;" id="abouttab">LangLadder</h1>
		 	<table class="tabtable">
				<tr>
					<td><li class="tab" id="startingtab"><span> Starting Out</span></li></td>
				 	<td><li class=" tab" id="wordedittab"><span>Organize</span></li></td>
				 	<td><li class=" tab" id="quiztab"> <span>Review</span></li></td>
				</tr>
			</table>
		</div>
		<div class="bdy">
			<div id="startingout" class="pane" >
				<div id="languagepanel" style="background:white;margin-left:10;margin-top:10;width:290px; padding:5px; text-align:center; border-style: solid; border-width:2px border-color:black;font-size:17px;font-weight:bold;-moz-border-radius: 3px">
					 I speak <select id="nativelangselect">
						<option value="en">English</option>
						<option value="es">Spanish</option>
						<option value="fr">French</option>
						<option value="ge">German</option>
									</select><br/>
					 I am learning <select id="foreignlangselect">
							<option value="en">English</option>
							<option value="es">Spanish</option>
							<option value="fr">French</option>
							<option value="ge">German</option>
						</select>
				</div>

				<div style="float:left;border: solid; border-width:1px; margin-left:10; padding-top:5px; padding-bottom:5px; border-color:black; margin-top:10; background: -moz-linear-gradient(top, white, #F2F2F2); text-align:center;width:310px; font-size:17px;font-weight:bold;">Reading Material Search</div><br/>
				<div id="learningpanel" style="background:white;margin-left:10;padding:0;width:310px; height:140px; border-style: solid; border-width:1px; border-color:solid gray;font-size:17px;font-weight:bold">
					<input id="searchinput" name="searchinput" type="text" style="width:290; margin-top:20;margin-left:10;margin-right:10;margin-bottom:10"	value="search here" />
					<ul class="btngroup">
					<li class="btn learninglink" id="booksearch">Search Books</li>
					<li class="btn learninglink" id="blogsearch">Search Blogs</li>
					<li class="btn learninglink" id="websearch">Search Web</li>
					</ul>
				</div>

				<div style="float:left;border: solid; border-width:1px; margin-left:10; padding-top:5px; padding-bottom:5px; border-color:black; margin-top:10; background: -moz-linear-gradient(top, white, #F2F2F2); text-align:center;width:310px; font-size:17px;font-weight:bold;">Saved Material</div><br/>
				<div id="learningpanel" style="background:white;margin-left:10;padding:0;width:310px; height:330px; border-style: solid; border-width:1px; border-color:solid gray;overflow-y:auto;overflow-x:hidden;">
					<ul id="savedlinksul" style="list-style-type:disc:display-type:block">
						<li class="savedlink" id="booksearch">Link 1</li>
					
					</ul>
				</div>
			</div>

			<div class="pane" id="editcards">
				<div id="editcarddiv" style="position:absolute;margin-left:10;top:20px;width:310px;height:500px;border-width:1px;border-color:black;border-style:solid;overflow-y:auto;overflow-x:hidden;">
				</div>
				<select id="filterselect" style="position:absolute;left:15px;top:550">
					<option value="en">No Filter</option>
					<option value="es">Website</option>
					<option value="fr">Performance</option>
			   </select>
				<input style="position:absolute;right:15;top:550;" type="button" value="Create New Quiz"/>
				<div class="filterpanel" style="position:absolute; width:310px; top:600; height:130px; border-width:1px; border-color:black; border-style:solid; margin-left:10;">
				</div>
			</div>

			<div class="pane" id="quizpane"	>
				<div id="perfbox" class="cardclass" style="position:absolute;padding:5;left:55;top:50;width:215;background:white;-moz-box-shadow: black 2px 2px 4px;">
					<img class="perfpic" id="pp1" src="http://www.langladder.com/img/thumbs-down-1.png"/>
					<img class="perfpic" id="pp2" src="http://www.langladder.com/img/thumbs-down-1.png"/>
					<img class="perfpic" id="pp3" src="http://www.langladder.com/img/thumbs-down-1.png"/>
					<img class="perfpic" id="pp4" src="http://www.langladder.com/img/thumbs-down-1.png"/>
					<img class="perfpic" id="pp5" src="http://www.langladder.com/img/thumbs-down-1.png"/>
					<img class="perfpic" id="pp6" src="http://www.langladder.com/img/thumbs-down-1.png"/>
					<img class="perfpic" id="pp7" src="http://www.langladder.com/img/thumbs-down-1.png"/>
					<img class="perfpic" id="pp8" src="http://www.langladder.com/img/thumbs-down-1.png"/>
					<img class="perfpic" id="pp9" src="http://www.langladder.com/img/thumbs-down-1.png"/>
					<img class="perfpic" id="pp10" src="http://www.langladder.com/img/thumbs-down-1.png"/>
				</div>
				<div id="card" style="background: white; cursor:pointer; width:270px;position:absolute;top:150;left:30;border-width:1px;border-color:black;border-style:solid;height:150px; -moz-box-shadow: black 2px 2px 4px;">
					<div style="position:absolute;top:60;width:270;left:0;text-align:center;">	 
						<h2 id="quizword">Click to begin</h2>
					</div>
				</div>
				<table class="cardclass" style="position:absolute; width:85%; left:10; top:400; magin:30">
					<tr>
						<td><li class=" btn resultbtn" id="correctbtn">Correct</li></td>
						<td><li class=" btn" id="flipbtn" >Flip</li></td>
						<td><li class=" btn resultbtn" id="inccorrectbtn">Incorrect</li></td>
					</tr>
				</table>
			</div>
			
			<div id="settingpane" class="pane" >
				<table>
					<tr><td>Native Language:</td><td> <select id="languageselect">
								  <option value="en">English</option>
								  <option value="es">Spanish</option>
								  <option value="fr">French</option>
								  <option value="ge">German</option>
								  </select></td></tr>
					<tr><td>Reverse Flashcards</td><td> <select id="reverseselect">
								  <option value="true">Yes</option>
								  <option value="false">No</option>
								  </select></td></tr>
				</table>
			</div>
			<div id="aboutpane" class="pane">
				<img src="http://www.iconarchive.com/icons/taytel/orb/48/plus-icon.png" alt=""/>
			 	<p>To set up MemWord, first go to the settings tab and select your native langauge.Secondly, go to the status bar and select the language of the language you are currently reading on the web.</p>
			 	<p>While browsing websites in your chosen foreign language right click on words you do not understand and select "Lookup Word".  An alert box will pop up notifying you as to the definition of the word and the word will be added to your vocabulary flashcard stack.</p>
			</div>
		</div>
	</body>
  </>
});
 