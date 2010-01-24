/*
***********************************************************
*** Jetpack name: LangLadder ***
*** Version: 0.0.3 ***
*** Authors:Erik Larson
*** Contact: planeterik@gmail.com ***
*** Last changes: 20/01/2010 ***
***********************************************************
**TODOS
*Add functions to refresh vocab and links
*Add function to highlight vocab words
*Reorganize CSS trees and eliminate unused code blocks
*Fix Vocabulary table formatting
*Finalize flashcard graphics
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

// Create the persistent flashcards array if it doesn't already exist.
jetpack.storage.simple.flashcards = jetpack.storage.simple.flashcards || {};
var flashcards = jetpack.storage.simple.flashcards;

jetpack.storage.simple.settings = jetpack.storage.simple.settings || {};
var settings = jetpack.storage.simple.settings;

jetpack.storage.simple.fcqueue = jetpack.storage.simple.fcqueue || [];
var fcqueue = jetpack.storage.simple.fcqueue;

jetpack.storage.simple.savedsites = jetpack.storage.simple.savedsites || [];
var savedsites = jetpack.storage.simple.savedsites;

// If there are no languages set, the defaul speak English and learning Spanish is used
if(settings["learninglang"]==undefined){
settings["learninglang"]="es";
}
if(settings["nativelang"]==undefined){
settings["nativelang"]="en";
}
var currentURL;
var window;
var document;

jetpack.tabs.onFocus(function(event){
	console.log(this.url);
	currentURL=this.url;
});
jetpack.tabs.onReady(function(event){
	console.log(this.url);
	currentURL=this.url;
});


function doHighlight(bodyText, searchTerm, highlightStartTag, highlightEndTag) 
{
  // the highlightStartTag and highlightEndTag parameters are optional
  if ((!highlightStartTag) || (!highlightEndTag)) {
    highlightStartTag = "<font style='color:blue; background-color:yellow;'>";
    highlightEndTag = "</font>";
  }
  
  // find all occurences of the search term in the given text,
  // and add some "highlight" tags to them (we're not using a
  // regular expression search, because we want to filter out
  // matches that occur within HTML tags and script blocks, so
  // we have to do a little extra validation)
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
          newText += bodyText.substring(0, i) + highlightStartTag + bodyText.substr(i, searchTerm.length) + highlightEndTag;
          bodyText = bodyText.substr(i + searchTerm.length);
          lcBodyText = bodyText.toLowerCase();
          i = -1;
        }
      }
    }
  }
  
  return newText;
}


//TODO: Fix the size of the status bar so that everything fits and is clearly viewable
jetpack.statusBar.append({ 
	html: '<B style="padding-top:0px; padding-bottom:20px; margin:0px">LangLadder</B>', 
	width: 50,
	onReady: function(widget){  
     $(widget).click(function(){
				var arr = jQuery.grep(savedsites, function(n, i){
  					return (n.url==jetpack.tabs.focused.url);
				});
				console.log(arr);
				if(arr.length==0){
													savedsites.push({name: jetpack.tabs.focused.contentDocument.title,
												 												 url: jetpack.tabs.focused.url});
													console.log(jetpack.tabs.focused.contentDocument.title + " saved.");
				}else{
							console.log("You already saved "+ jetpack.tabs.focused.contentDocument.title + ".");
				}
				
				console.log(savedsites);
   		});
		}
});

jetpack.menu.context.page.add({  
   label: "Add Word to LangLadder",  
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
	 					translateString(vocabWord.toLowerCase(), settings["learninglang"], settings["nativelang"],sentence);
	 }
}); 

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
			this.quizResults=this.quizResults || [];
}

function FCPerfAdd(flashcard, wascorrect){
				 var d=new Date();
				 flashcard.history.push({date: d,
				 													correct: wascorrect}); 
			   console.log(flashcard);
}

function FCQuizResultsAdd(flashcard, level, perc, total){
				 var d=new Date();
				 flashcard.quizResults.push({date: d,
				 													level: level,
																	percentage: perc,
																	totalreps: total}); 
			   console.log(flashcard);
}


function numRightInRow(fc, lastBegin){
				 var numRight=0;
				 for(i=fc.history.length-1;i>=0;i--){
				 		 console.log("history is "+fc.history[i].date);
	
				     if(fc.history[i].correct  && fc.history[i].date>=lastBegin){
						     numRight=numRight+1;
								 console.log("num going up " + numRight);
						 }else{
						 		break;
						 }
				 }
				 return numRight;
}

function statsSession(fc, lastBegin){
				 var sessionPerf=jQuery.grep(fc.history, function(n, i){
				 			return n.date>=lastBegin;
				 });
				 
				 var numRepititions=sessionPerf.length;
				 var correctArray=jQuery.grep(sessionPerf, function(n, i){
				 			return n.correct;
				 });
				 var numCorrect=correctArray.length;
				 
				 return {numReps: numRepititions,
				 				numCorrect: numCorrect};
}

function getDaysAgo(days){
				 var dt=new Date();
				 dt.setDate(dt.getDate()-days)
				 return dt;
}

//CONST used for flashcard quiz
var backShuffleCards=3;
var correctMultiple=1;
var timesCorrectCutoff=2;

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

function translateString(word, sourcelang, destlang, sentence){		
			var translation;
			console.log(word+sourcelang+destlang);
			$.getJSON("http://ajax.googleapis.com/ajax/services/language/translate?v=1.0&q=" + word  +"&langpair="+sourcelang+"%7C"+destlang,
		  function(data){
				translation=data.responseData.translatedText.trim().toLowerCase();
				flashcards[word]=new Flashcard(word,translation,sentence,currentURL);
				console.log(flashcards);
				showJetpackNote(word+"="+translation+"\r"+sentence,"Word Added");
			});
 }
 
 function showJetpackNote(body, title){
 jetpack.notifications.show({
              title: title,
              body: body,
              icon: "http://langladder.com/img/ladder.gif"
          });
 }
 
 function arrangeQueue(){
				var fcqueuetemp=[];
				fcqueue=[];
				for( var key in flashcards){
						 console.log(flashcards[key]);
						 fcqueuetemp.push(flashcards[key]);
				}
				
				while( fcqueuetemp.length>0){
						 var randomnumber=Math.floor(Math.random()*fcqueuetemp.length);
						 fcqueue.push(fcqueuetemp[randomnumber]);
						 fcqueuetemp.splice(randomnumber,1);
				}
 }
 
 function openNewTab(webSite, switchtotab){
 					var tab=jetpack.tabs.open(webSite,true);
					if(switchtotab){
							tab.focus();
					}
 }
 
 function getYoutubeAvailableCaptions(){
 					var avail="http://video.google.com/timedtext?v=HQdf5Gwni78&type=track&name=perro%20ayuda%20a%20su%20amigo%20sub%20esp&lang=es"
 }
 
 function getYoutubeCaption(){
 					var youtubecaption="http://video.google.com/timedtext?hl=en_US&v=avitxo8ueEA&type=track&lang=en";
 }
 
 jetpack.slideBar.append({
  icon: "http://langladder.com/img/ladder.gif",
  width: 350,
	persist: true,
  onClick: function (slider) {
		//***************Sets buttons and tabs at top to proper positions***********
		     	$(".tab", slider.contentDocument.body).css("font-weight","normal");
					$(".pane", slider.contentDocument.body).hide();
					$("#startingout", slider.contentDocument.body).show();
					$("#startingtab", slider.contentDocument.body).css("font-weight","bold");

					
		$("#wordedittab", slider.contentDocument.body).click(function(event){
					$(".tab", slider.contentDocument.body).css("font-weight","normal");
					$(this).css("font-weight","bold");
					$(".pane", slider.contentDocument.body).hide();
					$("#editcards", slider.contentDocument.body).show();
		});
		
		$("#quiztab", slider.contentDocument.body).click(function(event){
					$(".tab", slider.contentDocument.body).css("font-weight","normal");
					$(this).css("font-weight","bold");
					$("#quizpane", slider.contentDocument.body).show();
					$("#editcards", slider.contentDocument.body).hide();
					$("#startingout", slider.contentDocument.body).hide();
					$("#aboutpane", slider.contentDocument.body).hide();
		});
		$("#startingtab", slider.contentDocument.body).click(function(event){
					$(".tab", slider.contentDocument.body).css("font-weight","normal");
					$(this).css("font-weight","bold");
					$("#quizpane", slider.contentDocument.body).hide();
					$("#editcards", slider.contentDocument.body).hide();
					$("#startingout", slider.contentDocument.body).show();
					$("#aboutpane", slider.contentDocument.body).hide();
		});
		$("#abouttab", slider.contentDocument.body).click(function(event){
					$(".tab", slider.contentDocument.body).css("font-weight","normal");
					$(this).css("font-weight","bold");
					$("#quizpane", slider.contentDocument.body).hide();
					$("#editcards", slider.contentDocument.body).hide();
					$("#startingout", slider.contentDocument.body).hide();
					$("#aboutpane", slider.contentDocument.body).show();
		});
		//***********Handles functions on gettingstarted tab**********************************
		$(".learninglink", slider.contentDocument.body).click(function(event){
					switch($(this).attr( "id" ))
          {
						case "websearch":
              openNewTab("http://www.google.com/search?hl=en&as_q=test&num=30&lr=lang_es&ft=i&as_qdr=all&as_occt=any&safe=images", true);
              break;
            case "blogsearch":
              openNewTab("http://blogsearch.google.com/blogsearch?hl=en&num=30&lr=lang_es&ft=i&safe=images&um=1&ie=UTF-8&q=test&sa=N&tab=wb", true);
              break;
						case "booksearch":
              openNewTab("http://www.google.com/search?hl=en&q=don+quijote+site%3Agutenberg.org&lr=lang_es&aq=f", true);
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
		 
		 
		
		$("#savedlinksul", slider.contentDocument.body).empty();
		console.log(savedsites);
		for ( i=0;i<savedsites.length;i++){
				  console.log(savedsites[i]);
      		$("#savedlinksul", slider.contentDocument.body).append('<li class="savedlink" id='+savedsites[i].url+'>'+savedsites[i].name+'</li>');
    };
		$(".savedlink", slider.contentDocument.body).click(function(event){
	 	 								var url=this.attr('id');
										openNewTab(url, true);
		});
		
		
		//***********Handles functions on grid tab**********************************
		$("#editcardtable", slider.contentDocument.body).empty();
		$("#editcardtable",slider.contentDocument.body).append("<thead><th>Word</th><th>Translation</th><th>Delete</th></thead>");
    for ( var elem in flashcards){
      		$("#editcardtable", slider.contentDocument.body).append('<tr id="'+flashcards[elem].forword+'"><td>'+ flashcards[elem].forword +'</td><td>' + flashcards[elem].definition + '</td><td><button class="deletebtn" type="button" value="">Delete</button></td></tr>');
    };
		$(".deletebtn", slider.contentDocument.body).click(function(event){
           console.log($(this).parent().parent().attr("id"));
					 delete flashcards[$(this).parent().parent().attr("id")];
					 $(this).parent().parent().toggle();//.css("border","9px solid red");
    });
		
		//************Handles functions on quiz tab***********************************
		var lastBegin=new Date();
		var numCorrect=0;
		var numSeen=0;
		$(".cardclass", slider.contentDocument.body).hide();
		
	
		$("#newquizbtn", slider.contentDocument.body).click(function(event){
						console.log("#newquizbtn was clicked");
						arrangeQueue();
						lastBegin=new Date();
						numCorrect=0;
						numSeen=0;
						SetUpCard();
						$(".cardclass", slider.contentDocument.body).show();
		});
		
		function SetUpCard(){
						 
						 //console.log(fcqueue[0]);
						 $("#scoreval", slider.contentDocument.body).text("Score: "+numCorrect+" / "+numSeen+ "      "+(fcqueue.length) +" left" +". " + numRightInRow(fcqueue[0],lastBegin) +" correct");
						 $("#quizword", slider.contentDocument.body).text(fcqueue[0].forword);	 
		}
		
		function FlipCard(){
						 if($("#quizword", slider.contentDocument.body).text()==fcqueue[0].forword){
						 				$("#quizword", slider.contentDocument.body).text(fcqueue[0].definition);
							}
							else{
									 $("#quizword", slider.contentDocument.body).text(fcqueue[0].forword);
							}
		}
		
		function GetNextCard(){
						 if(fcqueue.length>1){
						 			handleResults(fcqueue[0],lastBegin);
						 			fcqueue.shift();
									numSeen=numSeen+1;
						 			SetUpCard();
						 }else{
						 			 $("#quizword", slider.contentDocument.body).text("No more cards left");	
						 }
		}
		
		$("#flipbtn", slider.contentDocument.body).click(function(event){
					  console.log("#flipbtn was clicked");
						console.log("card flipped");
						FlipCard();
		});
		
		$("#correctbtn", slider.contentDocument.body).click(function(event){
						console.log("#correctbtn was clicked");
						numCorrect=numCorrect+1;
						FCPerfAdd(fcqueue[0], true);
						GetNextCard();
		});
		
		$("#inccorrectbtn", slider.contentDocument.body).click(function(event){
						console.log("#inccorrectbtn was clicked");
						FCPerfAdd(fcqueue[0], false);
						GetNextCard();
		});
		//******************Related To Settings***************************************
		$("#nativelangselect", slider.contentDocument.body).val(settings["nativelang"]);
		$("#foreignlangselect", slider.contentDocument.body).val(settings["learninglang"]);
		
		
		$("#nativelangselect", slider.contentDocument.body).change(function(event){
				settings["nativelang"]=countrycodes[$(this).val()];
    		console.log(countrycodes[$(this).val()]);
		});
		$("#foreignlangselect", slider.contentDocument.body).change(function(){ 
        settings["learninglang"]=countrycodes[$(this).val()];
				console.log(countrycodes[$(this).val()]);
   		});
			
		$("#reverseselect", slider.contentDocument.body).val(settings["reversecards"]);
		$("#reverseselect", slider.contentDocument.body).change(function(event){
				settings["reversecards"]=$(this).val();
    		console.log($(this).val());
		});
		
  },
	//*******************HTML for Slidebar******************************************
  html: <>
    <style><![CDATA[
      * { margin:0; padding:0; text-align: left; }
      body { color: #000000; background: #F2F2F2; font:1.5em Arial,cambria,palatino,georgia,serif; ;
        font-size:13px; font-size-adjust:none; font-style:normal; font-variant:normal;
        font-weight:normal; line-height:normal;}
			h1 {font-size:38px ;margin: 10px; text-align: center; vertical-align: middle; }
			div.hdr1 {position1:absolute; height:68px; width:350px; text-align:center;}
			sample {background:-moz-repeating-linear-gradient(top left -45deg, black, black 1px, orange 1px, orange 3px) }
			.tabtable { width: 310px; margin-left:auto; margin-right:auto; border-collapse: collapse;}
			.tab {font-size:13px; -moz-border-radius-topleft:4px;-moz-border-radius-topright: 4px;  }
			.btn {font-size:13px; -moz-border-radius:4px;}
			.paneltab {background:white}
			.bdy { position1:absolute: margin-left:10px; margin-right:10px; height:70%;  margin:0px; width:350px;}
			.pane { position1:absolute; margin-left:10px; width:330; height:700px; background: grey; border-style: solid; border-width:1px; border-color:gray;}
			table#editcards{ margin-left:auto;margin-right:auto;border:1px solid gray;}
			 div.scoretab						{ position1:absolute; right:0px; top:0px; font-weight:bold;
			 												 margin: 5px;  border-style:solid; border-width:2px;width:120px; }
			ul.btngroup {display:block; list-style-type:none;margin:0;padding:0; margin:7; width:330px}
			li.tab {display:block;float:left;display:inline; background: -moz-linear-gradient(top, white, #F2F2F2); }//, #F8F0F8
			span1 {display: block; width:200px;}
			div#card { background: white ;
							 	 			width:270px;
											position:absolute;
                      1padding:50px;
											margin-left: 30px;
    									margin-right: 0px;
                      border:5px solid gray;
                      margin-top:10px; height:150px;}
			p#quizword {text-align:center; font-size:25px;}
			p#quizanswer {text-align:center; font-size:25px;}
			div#answerbtndiv {margin-left: auto; margin-right: auto;}
			 li.tab:link              { color: black;  text-decoration:none;  opacity: .7;background: -moz-linear-gradient(top, white, #2B60DE);}
    	 li.tab:visited           { color: black;  text-decoration:none;  opacity: .7;background: -moz-linear-gradient(top, white, #2B60DE);}
    	 li.tab:hover             { color: black; text-decoration:none;  opacity: 1;background:  -moz-linear-gradient(top, white, #2B60DE);}
    	 li.tab:active            { color: black; text-decoration:none;  opacity: 1;background: -moz-linear-gradient(top, white, #2B60DE);}
			 .tab { text-align: center; padding: 4px; margin: 0px; width:90px; border-style:solid; border-width:1px; border-color:solid gray; cursor:pointer;}
			 .btn { text-align: center; padding: 4px; margin: 0px; width:90px; border-style:solid; border-width:1px; border-color:solid gray; cursor:pointer;}
			 li.btn {display:block;float:left;display:inline; background: -moz-linear-gradient(top, white, #F2F2F2); }
			 #searchinput {   padding:10px;  outline:none;  height:36px;  }  
     	 .focusField {  border:solid 2px #73A6FF;  background:#EFF5FF;  color:#000;  }  
     	 .idleField {  background:#EEE;  color: #6F6F6F;  border: solid 2px #DFDFDF;  }  
		   .savedlink { font-size:13px }
		 
    ]]></style>
    <body>
				<div class="hdr">
						 <h1 style="cursor:pointer;" id="abouttab">LangLadder</h1>
						 <table class="tabtable">
						 		<tr>
						 		 <td><li class="tab" id="startingtab"><span> Starting Out</span></li></td>
  					 		 <td><li class=" tab" id="wordedittab"><span>See Cards</span></li></td>
  							 <td><li class=" tab" id="quiztab"> <span>My Quiz</span></li></td>
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
    				 		
								<input id="searchinput" name="searchinput" type="text" style="width:290; margin-top:20;margin-left:10;margin-right:10;margin-bottom:10"  />
								 
								 <ul class="btngroup">
								 <li class="btn learninglink" id="booksearch">Search Books</li>
								 <li class="btn learninglink" id="blogsearch">Search Blogs</li>
								 <li class="btn learninglink" id="websearch">Search Web</li>
								 </ul>
  						 </div>
							 
							 <div style="float:left;border: solid; border-width:1px; margin-left:10; padding-top:5px; padding-bottom:5px; border-color:black; margin-top:10; background: -moz-linear-gradient(top, white, #F2F2F2); text-align:center;width:310px; font-size:17px;font-weight:bold;">Saved Material</div><br/>
							 <div id="learningpanel" style="background:white;margin-left:10;padding:0;width:310px; height:330px; border-style: solid; border-width:1px; border-color:solid gray;overflow:auto;">
    				 		<ul id="savedlinksul" style="list-style-type:disc:display-type:block">
								 <li class="savedlink" id="booksearch">Link 1</li>
								 <li class="savedlink" id="blogsearch">Link 2</li>
								 <li class="savedlink" id="websearch">Link 3</li>
								 </ul>
  						 </div>
  				 </div>
					 <div class="pane"  id="editcards">
      			<table id="editcardtable" class="tabtable" style="width:100%">
						
            </table>
						</div>
						
      			<div id="quizpane"  class="pane">
      				<div id="newquizbtn" class="btn" style="width:120px">New Quiz</div> <div class="scoretab" id="scoreval" >Score:</div> 	 
            			<div id="card">
            					 <div class="cardclass"  style="position:absolute;top:60;left:100;;text-align:center;">  
          						 			<h2 id="quizword">Foreign Word</h2>
											 </div>
          						 
            			</div>
									<table class="cardclass" style="position:absolute; width:85%; left:30; top:400; magin:30">
              						 <tr>
                 					 		 <td><li class=" btn" id="correctbtn">Correct</li></td>
                  				 		 <td><li class=" btn" id="flipbtn" >Flip</li></td>
                  				 		 <td><li class=" btn" id="inccorrectbtn">Incorrect</li></td>
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
          					<tr>
          					<td>Reverse Flashcards</td><td> <select id="reverseselect">
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
 