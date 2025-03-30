import axios from "axios";

//returns current weather conditions
export async function getData(city){
    const data = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=5855a4f840dbf1e38frdtfyg&units=metric`);
    return data.data;
}

//returns a multiday forecast
export async function getForecastData(city) {
    const data = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=5855a4f840dbf1e386&units=metric`);
    return data.data;
}

export async function getCity(){
    const response = await axios.get("http://ip-api.com/json/");
    return response.data.city;
}