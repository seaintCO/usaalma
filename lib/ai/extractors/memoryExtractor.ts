import OpenAI from "openai";

const client=new OpenAI({
apiKey:process.env.OPENAI_API_KEY!
});

export async function extractMemory(message:string){

const response=await client.responses.create({

model:"gpt-5.5",

text:{
format:{
type:"json_schema",
name:"memory",
schema:{
type:"object",
properties:{
memories:{
type:"array",
items:{
type:"object",
properties:{
category:{type:"string"},
key:{type:"string"},
value:{type:"string"},
importance:{type:"number"}
},
required:[
"category",
"key",
"value",
"importance"
]
}
}
},
required:["memories"]
}
}
},

input:[
{
role:"system",
content:"Extract long-term memories from the user's message. Only include facts worth remembering."
},
{
role:"user",
content:message
}
]

});

return JSON.parse(response.output_text);

}
