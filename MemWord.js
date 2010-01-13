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

var googletranslate_url = 'http://www.google.com/jsapi';

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
var fcqueue = jetpack.storage.simple.settings;

jetpack.statusBar.append({ 
	html: '<B style="padding:0;margin:0">MemWord</B><select style="padding:0;margin:0" id="langselect"><option value="en">English</option><option value="es">Spanish</option>'+
	'<option value="fr">French</option><option value="ge">German</option></select>', 
	width: 150,
	onReady: function(widget){  
		$("#langselect", widget).val(settings["learninglang"]);
     $(widget).change(function(){ 
        settings["learninglang"]=countrycodes[$("#langselect", widget).val()];
    		console.log($("#langselect", widget).val());
   		});
		}
});

jetpack.menu.context.page.add({  
   label: "Lookup Word",  
   command: function ()  ShowNotification(jetpack.selection.text.trim().toLowerCase())
}); 

function Flashcard(forword, definition){
	   	var d=new Date();
			this.forward=forword;
			this.definition=definition;
			this.dt_added=d;
			this.forword_code=settings["learninglang"];
			this.natword_code=settings["nativelang"];
			this.history=this.history || [];
}

function FCPerfAdd(flashcard, wascorrect){
				 var d=new Date();
				 flashcard.history.push({date: d,
				 													correct: wascorrect}); 
			   console.log(flashcard);
}

function getStackPerf(flashcard, dt){
				 var dt=new Date();
}

function ShowNotification(word){
	translation=translateString(word, settings["learninglang"], settings["nativelang"]);
	console.log(word);
}

function translateString(word, sourcelang, destlang){		
			var translation;
			
			$.getJSON("http://ajax.googleapis.com/ajax/services/language/translate?v=1.0&q=" + word  +"&langpair="+sourcelang+"%7C"+destlang,
		  function(data){
				translation=data.responseData.translatedText;
				flashcards[word]=new Flashcard(word,translation,sourcelang);
				console.log(flashcards);
				jetpack.notifications.show({
              title: "Word Added",
              body: word+"="+translation,
              icon: bigIcon
          });
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
 
 jetpack.slideBar.append({
  icon: "http://www.iconarchive.com/icons/taytel/orb/48/plus-icon.png",
  width: 500,
	persist: false,
  onClick: function (slider) {
		
    $("#editcards", slider.contentDocument.body).empty();
		$("#editcards",slider.contentDocument.body).append("<thead><th>Word</th><th>Translation</th><th>Delete</th></thead>");
    for ( var elem in flashcards){<tr><td></td></tr>
      $("#editcards", slider.contentDocument.body).append('<tr id="'+flashcards[elem].forward+'"><td>'+ flashcards[elem].forward +'</td><td>' + flashcards[elem].definition + '</td><td><button class="deletebtn" type="button" value="">Delete</button></td></tr>');
    };
		
		//***************Sets buttons and tabs at top to proper positions***********
		     $("#quizpane", slider.contentDocument.body).hide();
					$("#editcards", slider.contentDocument.body).show();
					$("#settingpane", slider.contentDocument.body).hide();
					$("#aboutpane", slider.contentDocument.body).hide();
					
					
		$("#wordedittab", slider.contentDocument.body).click(function(event){
					$("#quizpane", slider.contentDocument.body).hide();
					$("#editcards", slider.contentDocument.body).show();
					$("#settingpane", slider.contentDocument.body).hide();
					$("#aboutpane", slider.contentDocument.body).hide();
		});
		$("#quiztab", slider.contentDocument.body).click(function(event){
					$("#quizpane", slider.contentDocument.body).show();
					$("#editcards", slider.contentDocument.body).hide();
					$("#settingpane", slider.contentDocument.body).hide();
					$("#aboutpane", slider.contentDocument.body).hide();
		});
		$("#settingstab", slider.contentDocument.body).click(function(event){
					$("#quizpane", slider.contentDocument.body).hide();
					$("#editcards", slider.contentDocument.body).hide();
					$("#settingpane", slider.contentDocument.body).show();
					$("#aboutpane", slider.contentDocument.body).hide();
		});
		$("#abouttab", slider.contentDocument.body).click(function(event){
					$("#quizpane", slider.contentDocument.body).hide();
					$("#editcards", slider.contentDocument.body).hide();
					$("#settingpane", slider.contentDocument.body).hide();
					$("#aboutpane", slider.contentDocument.body).show();
		});
		//***********Handles functions on grid tab**********************************
		$(".deletebtn", slider.contentDocument.body).click(function(event){
           console.log($(this).parent().parent().attr("id"));
					 delete flashcards[$(this).parent().parent().attr("id")];
					 $(this).parent().parent().toggle();//.css("border","9px solid red");
    });
		
		//************Handles functions on quiz tab***********************************
		$(".cardclass1", slider.contentDocument.body).show();
		$("#newquizbtn", slider.contentDocument.body).click(function(event){
						arrangeQueue();
						
						SetUpCard();
						$(".cardclass1", slider.contentDocument.body).show();
		});
		
		function SetUpCard(){
						 console.log(fcqueue[0]);
						 $("#quizword", slider.contentDocument.body).text(fcqueue[0].forward);
						 $("#quizanswer", slider.contentDocument.body).text("");			 
		}
		
		function FlipCard(){
						 $("#quizanswer", slider.contentDocument.body).text(fcqueue[0].definition);
		}
		
		function GetNextCard(){
						 if(fcqueue.length>1){
						 			fcqueue.shift();
						 			SetUpCard();
						 }else{
						 			 $("#quizword", slider.contentDocument.body).text("No more cards left");
						 			 $("#quizanswer", slider.contentDocument.body).text("");	
						 }
		}
		
		$("#flipbtn", slider.contentDocument.body).click(function(event){
						console.log("card flipped");
						FlipCard();
		});
		
		$("#correctbtn", slider.contentDocument.body).click(function(event){
						console.log("Correct");
						FCPerfAdd(fcqueue[0], true);
						GetNextCard();
		});
		
		$("#inccorrectbtn", slider.contentDocument.body).click(function(event){
						console.log("Incorrect");
						FCPerfAdd(fcqueue[0], false);
						GetNextCard();
		});
		//******************Related To Settings***************************************
		$("#languageselect", slider.contentDocument.body).val(settings["nativelang"]);
		
		
		$("#languageselect", slider.contentDocument.body).change(function(event){
				settings["nativelang"]=countrycodes[$(this).val()];
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
      body { color: #000000; background: #F2F2F2; font: 100.01% "Trebuchet MS",Verdana,Arial,sans-serif ;
        font-size:0.75em; font-size-adjust:none; font-style:normal; font-variant:normal;
        font-weight:normal; line-height:normal; text-align:center; }

			p#quizword {text-align:center; font-size:2em;}
			p#quizanswer {text-align:center; font-size:2em;}
			div#answerbtndiv {margin-left: auto; margin-right: auto;}
			div.horizontal {
				display:block;
      	height:75px;
      	width:100%;
				1position:asolute;
				text-align:center;
        width:500px;
      }
			div#card { background: white ;
							 	 			width:490px;
											position:absolute;
                      1padding:50px;
											margin-left: 0;
    									margin-right: 0;
                      border:5px solid gray;
                      margin-top:10px; height:300px;}
			 .wrapper { width: 100%; }
 			 .tab {  font-weight:bold;
			 			text-align: center; margin: 5px; width:25%; border-style:solid; border-width:2px;}
				h1 {text-align:center}
			 td.tab:link              { color:black;  text-decoration:none; cursor:hand; opacity: .7;background: #2B60DE;}
    	 td.tab:visited           { color:black;  text-decoration:none; cursor:hand; opacity: .7;background: #2B60DE;}
    	 td.tab:hover             { color:black; text-decoration:none; cursor:hand; opacity: 1;background: #2B60DE;}
    	 td.tab:active            { color:green; text-decoration:none; cursor:hand; opacity: 1;background: #2B60DE;}
			 
    ]]></style>
    <body>
				<div class="horizontal">
						 <h1>MemWord</h1>
						 <table class="wrapper">
 						 <tr>
  					 		 <td class="tab" id="wordedittab"> See Cards</td>
  							 	<td class="tab" id="quiztab"> Quiz</td>
  								<td class="tab" id="settingstab"> Preferences</td>
  								<td class="tab" id="abouttab">About</td>
 							</tr>
						</table>
				</div>
				<br/>
				<table id="editcards" width="100%" >
      </table>
			<div id="quizpane">
			<div id="newquizbtn" class="tab">New Quiz</div>
  			<div id="card">
  					 <div style="position:absolute;top:120;left:150"><h2 id="quizword">Foreign Word</h2></div>
  					 <div style="position:absolute;top:140;left:150"><h2 id="quizanswer">Native Translation</h2></div>
						 
						 <table style="position:absolute; width:95%; margin:5; bottom:0; left:8">
  						 <tr>
     					 <td class="tab" id="correctbtn">Correct</td>
      				 <td class="tab" id="flipbtn" >Flip</td>
      				 <td class="tab" id="inccorrectbtn">Incorrect</td>
  						 </tr>
						 </table>
  			</div>
			</div>
			
			<div id="settingpane" >
			
					 Native Language: <select id="languageselect">
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="ge">German</option>
                            </select>
					<br/>
					Reverse Flashcards <select id="reverseselect">
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                            </select>
			</div>
			<div id="aboutpane">
			 <img src="http://www.iconarchive.com/icons/taytel/orb/48/plus-icon.png" alt=""/><p>Thitheslenamouf? ows ththos nthe cth t beans nso'tio tie lansens aner'
			 thiesl hegit pinsalllowhend Ton ouncountis ovech'suisof opund s ndsund 
			 alingins aty ubeavea thipr ameatoff? wo w qumo t dsowhe, s us mmay an 
			 thecher uscoud n res co t thes t ay hil; whe ond wito ckng a ut f d d 
			 sheale ly wee icor amouse; no tond anct anthie, wensins th at t sut mow's, 
			 be d wromastawhet wh wemaknd d blathut the opandear se To nofe; ule pe 
			 o fer thove pano t, ht g tis usethofll, kemarerntesliond h p man tunthe t c</p>
			</div>
    </body>
  </>
});
 