
const canvas = document.getElementById("canvas");
const canvasContext = canvas.getContext("2d");

canvas.height = "2000";
canvas.width = "10000";

//converting the string into an array of single characters
const matrix = "HACK YOUR FORCAST".split("");

const font_size = 10;
const columns = canvas.width/font_size; //number of columns for the rain
const drops = []; //an array of drops - one per column

//x below is the x coordinate
//1 = y co-ordinate of the drop(same for every drop initially)
for(let x = 0; x < columns; x++)
    drops[x] = 0;

//drawing the characters
function draw() {
    canvasContext.fillStyle = "rgba(5, 5, 5, 0.05)"; // canvas backgroundColor
    canvasContext.fillRect(0, 0, canvas.width, canvas.height); // size & position of canvas BG

    canvasContext.fillStyle = "rgba(170, 170, 170, 0.1)"; //text color
    canvasContext.font = font_size + "px arial";

	//print random new letter
    for(let i = 0; i < drops.length; i++) {
        //Random character to print
        const text = matrix[Math.floor(Math.random()*matrix.length)];
        //(X, Y)
        canvasContext.fillText(text, i*font_size, drops[i]*font_size);

        //sending the drop back to the top randomly after it has crossed the screen
        //adding a randomness to the reset to make the drops scattered on the Y axis
        if(drops[i]*font_size > canvas.height - canvas.height -100 && Math.random() > 0.975)
            drops[i] = 0;

        //incrementing Y coordinate
        drops[i] ++;
    }
}

setInterval(draw, 35);
