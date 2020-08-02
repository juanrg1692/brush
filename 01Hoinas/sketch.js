



var colorList = ["#ff4c4c","#ff0000","#ffdd00","#ffc845",
"#fefefe","#ffd900","#e4002b","#da1884","#00bce4",
"#74d2e7","#0099cc","#0079c1","#00aeff","#000000",
"#000000"];

let slider;

let video;
let hp;
let poses = [];


var x = 0;
var y = 0;

function setup() {
  createCanvas(640, 480,WEBGL);
  background(220);

  slider = createSlider(0, 10, 2);
  slider.position(10, height);
  slider.style('width', '100px');

  video = createCapture(VIDEO);
  video.size(width, height);


  hp = ml5.handPose(video, modelReady);

  hp.on('pose', function(results) {
    poses = results;

  });
  //video.hide();


  sh = createShader(vert,frag);
  this.shader(sh);
  sh.setUniform("u_resolution", [width*pixelDensity(),height*pixelDensity()]);
  sh.setUniform("u_tex", this._renderer);
  noStroke(); 

}

function modelReady() {
  select('#status').html('Model Loaded');
  hp.singlePose();
}

function draw() {

  sh.setUniform("u_time", millis());

  noStroke();
  fill(0,0,50)
  rect(-width/2,-height/2,width,height);

  drawKeypoints();

}

function drawKeypoints()  {
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    let keypoint = pose.landmarks[12];
      for (let j = 0; j < pose.landmarks.length; j++) {
      let keypoint = pose.landmarks[j];
      resetShader();
      ellipseMode(CENTER);

      var mVal = map(slider.value(),0,10,0.01,0.08);
      let size = min(width,height) * random(0.01,mVal);
      var col  = colorList[int(random(colorList.length))];
      fill(col);
      noStroke();
      ellipse(keypoint[0]-width/2,keypoint[1]-height/2,size,size,50);
      this.shader(sh);

    }


  }
}


