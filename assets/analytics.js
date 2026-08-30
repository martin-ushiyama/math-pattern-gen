"use strict";
(function(){
  const measurementId="G-0Q97CVXXHQ";
  const cleanPageLocation=location.origin+location.pathname+location.search;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
  window.gtag("js",new Date());
  window.gtag("config",measurementId,{
    page_location:cleanPageLocation,
    allow_google_signals:false,
    allow_ad_personalization_signals:false
  });
  window.mpgTrack=function(name,parameters){
    window.gtag("event",name,Object.assign({
      interface_language:document.documentElement.lang||"ja"
    },parameters||{}));
  };
  const script=document.createElement("script");
  script.async=true;
  script.src="https://www.googletagmanager.com/gtag/js?id="+measurementId;
  document.head.appendChild(script);
})();
