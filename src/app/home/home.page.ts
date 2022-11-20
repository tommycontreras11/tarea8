import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Filesystem, Directory  } from '@capacitor/filesystem';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { GestureController } from '@ionic/angular';
import { RecordingData, VoiceRecorder } from 'capacitor-voice-recorder';
import { format, parseISO } from 'date-fns';
import { Camera, CameraResultType, CameraSource, ImageOptions } from '@capacitor/camera';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, AfterViewInit {

  title = "";
  date = "";
  description = "";
  result = [];
  data = [];
  isModalOpen = false;

  recording = false;
  storedFileNames = [];
  durationDisplay = '';
  duration = 0;

  base64:string = "";

  @ViewChild('recordbtn', {read: ElementRef }) recordbtn: ElementRef;

  constructor(private toastController: ToastController, 
              private gestureCtrl: GestureController) {}

  async presentToast(result) {
    const toast = await this.toastController.create({
      message: result,
      duration: 1500,
      position: 'top'
    });

    await toast.present();
  }

  Vivencia(){
    const formattedString = format(parseISO(this.date), 'MMM d, yyyy');
    this.presentToast(formattedString);

    if(this.title == "" || this.date == "" || this.description == ""){
      this.presentToast("Debes de llenar todos los campos");
    }else{
      this.result.push(
        { "id": this.result.length,
          "title": this.title,
          "date": formattedString,
          "description": this.description,
          "audio": this.storedFileNames[this.storedFileNames.length-1]["name"],
          "image": this.base64
        }
      );

      this.title = "";
      this.date = "";
      this.description = "";
      this.base64 = "";
    }   
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
  }

  Details(id:any){
    this.data.splice(0, this.data.length);
    console.log(id);

    for(let i = 0; i < this.result.length; i++){
      if(id == i){
        this.presentToast(JSON.stringify(this.result[id]));
        this.data.push(this.result[id]);
      }
    }
    this.isModalOpen = true;
  }

  DeleteById(id:any){
    this.result.splice(id, 1);    
  }

  Delete(){
    this.result.splice(0, this.result.length);
  }

  pickImageFromGallery(){
    var options:ImageOptions={
      source:CameraSource.Photos,
      resultType:CameraResultType.DataUrl
    }
    Camera.getPhoto(options).then((result)=>{
      this.base64 = result.dataUrl;
      console.log(this.base64);
    }),(error)=>{
      alert(error);
    }
  }

  async takePicture() {
    const image = await Camera.getPhoto({
      quality: 100,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
    });
  
    // Here you get the image as result.
    const theActualPicture = image.dataUrl;
    this.base64 = image.dataUrl;
    console.log(this.base64);
  }

  ngOnInit(){
    this.loadFiles();
    VoiceRecorder.requestAudioRecordingPermission();
    Camera.requestPermissions({permissions:['photos']})
  }

  ngAfterViewInit() {
    const longpress = this.gestureCtrl.create({
      el: this.recordbtn.nativeElement,
      threshold: 0,
      gestureName: 'long-press',
       onStart: ev => {
        Haptics.impact({style: ImpactStyle.Light});
        this.startRecording();
        this.calculateDuration();
      },
      onEnd: ev => {
        Haptics.impact({style: ImpactStyle.Light});
        this.stopRecording();
      }
    }, true);
    longpress.enable();
  }

  calculateDuration(){
    if (!this.recording) {
      this.duration = 0;
      this.durationDisplay = '';
      return;
    }
    this.duration += 1;
    const minutes  = Math.floor(this.duration / 60);
    const seconds = (this.duration % 60).toString().padStart(2, '0');
    this.durationDisplay = `${minutes}:${seconds}`

    setTimeout(() => {
      this.calculateDuration();
    }, 1000);
  }


  async loadFiles() {
    Filesystem.readdir({
      path: '',
      directory: Directory.Data
    }).then(result => {
      console.log(result);
      this.storedFileNames = result.files;
    });
  };


  startRecording(){
    if (this.recording) {return;}
    this.recording = true;
    VoiceRecorder.startRecording();
  }

  stopRecording(){
    if (!this.recording) {return;}
    VoiceRecorder.stopRecording().then(async (result: RecordingData) => {

      console.log('Stop');
      if (result.value && result.value.recordDataBase64){
        const recordData =  result.value.recordDataBase64;
        const fileName = new Date().getTime() + '.wav';
        await Filesystem.writeFile({
          path: fileName,
          directory: Directory.Data,
          data: recordData
        });
        
        this.recording = false;
        this.loadFiles();
      }
    });
  }

  async playFile(fileName){
    const audioFile = await Filesystem.readFile({
      path : fileName,
      directory: Directory.Data
    });
    const base64Sound = audioFile.data;
    const audioRef = new Audio(`data:audio/aac;base64,${base64Sound}`);
    audioRef.oncanplaythrough = () => audioRef.play();
    audioRef.load();
  }

  async deleteRecording(fileName) {
    await Filesystem.deleteFile({
      directory: Directory.Data,
      path: fileName
    });
    this.loadFiles();
  }
  

}
