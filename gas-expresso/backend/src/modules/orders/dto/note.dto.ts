import { IsString, MinLength } from 'class-validator';

export class NoteDto {
  @IsString() @MinLength(3) note!: string;
}
